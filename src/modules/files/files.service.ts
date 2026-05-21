import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { mkdir, writeFile } from 'fs/promises';
import { basename, dirname, join, extname } from 'path';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../config/env';
import type { DocumentCategory, DocumentOwnerType } from '@prisma/client';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const LOGO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

@Injectable()
export class FilesService {
  private readonly uploadRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.uploadRoot = join(process.cwd(), 'uploads');
  }

  async upload(
    organizationId: string,
    uploadedById: string | null,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('No file provided');
    if (file.size > MAX_BYTES) throw new BadRequestException('File too large (max 10 MB)');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and PDF are allowed');
    }

    const sha256 = createHash('sha256').update(file.buffer).digest();
    const ext = extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    const fileName = `${randomUUID()}${ext}`;
    const key = `org/${organizationId}/${fileName}`;
    const bucket = 'local';
    const fullPath = join(this.uploadRoot, 'org', organizationId, fileName);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);

    const stored = await this.prisma.storedFile.create({
      data: {
        organizationId,
        bucket,
        key,
        mime: file.mimetype,
        size: BigInt(file.size),
        sha256,
        uploadedById: uploadedById ?? undefined,
        virusScanStatus: 'pending',
        isEncrypted: false,
      },
      select: { id: true, mime: true, size: true, createdAt: true },
    });

    return { ...stored, size: Number(stored.size) };
  }

  async uploadOrganizationLogo(
    organizationId: string,
    uploadedById: string | null,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('No file provided');
    if (file.size > LOGO_MAX_BYTES) throw new BadRequestException('Logo too large (max 2 MB)');
    if (!LOGO_MIME.has(file.mimetype)) {
      throw new BadRequestException('Logo must be JPEG, PNG, or WebP');
    }
    return this.upload(organizationId, uploadedById, file);
  }

  private async assertOwnerInOrg(
    organizationId: string,
    ownerType: DocumentOwnerType,
    ownerId: string,
  ) {
    const benSelect = { id: true, organizationId: true };
    switch (ownerType) {
      case 'beneficiary': {
        const row = await this.prisma.beneficiary.findFirst({
          where: { id: ownerId, organizationId, deletedAt: null },
          select: benSelect,
        });
        if (!row) throw new NotFoundException('Beneficiary not found');
        return;
      }
      case 'spouse': {
        const row = await this.prisma.spouse.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Spouse not found');
        return;
      }
      case 'child': {
        const row = await this.prisma.child.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Child not found');
        return;
      }
      case 'job': {
        const row = await this.prisma.job.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Job not found');
        return;
      }
      case 'housing': {
        const row = await this.prisma.housing.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Housing record not found');
        return;
      }
      case 'disease': {
        const row = await this.prisma.disease.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Disease record not found');
        return;
      }
      case 'serious_illness': {
        const row = await this.prisma.seriousIllness.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Serious illness record not found');
        return;
      }
      case 'social_coverage': {
        const row = await this.prisma.socialCoverage.findFirst({
          where: { id: ownerId, deletedAt: null, beneficiary: { organizationId, deletedAt: null } },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Social coverage not found');
        return;
      }
      default:
        throw new BadRequestException('Unsupported document owner type');
    }
  }

  async attachDocument(
    organizationId: string,
    input: {
      ownerType: DocumentOwnerType;
      ownerId: string;
      category: DocumentCategory;
      fileId: string;
      issuedOn?: string;
      expiresOn?: string;
    },
  ) {
    await this.assertOwnerInOrg(organizationId, input.ownerType, input.ownerId);

    const file = await this.prisma.storedFile.findFirst({
      where: { id: input.fileId, organizationId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');

    const doc = await this.prisma.document.create({
      data: {
        organizationId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        category: input.category,
        fileId: input.fileId,
        issuedOn: input.issuedOn ? new Date(input.issuedOn) : null,
        expiresOn: input.expiresOn ? new Date(input.expiresOn) : null,
      },
      select: {
        id: true,
        category: true,
        ownerType: true,
        ownerId: true,
        fileId: true,
        issuedOn: true,
        expiresOn: true,
        createdAt: true,
        file: { select: { mime: true, size: true } },
      },
    });

    return { ...doc, file: { ...doc.file, size: Number(doc.file.size) } };
  }

  async listDocuments(
    organizationId: string,
    ownerType: DocumentOwnerType,
    ownerId: string,
  ) {
    const docs = await this.prisma.document.findMany({
      where: { organizationId, ownerType, ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        ownerType: true,
        ownerId: true,
        fileId: true,
        issuedOn: true,
        expiresOn: true,
        createdAt: true,
        file: { select: { mime: true, size: true } },
      },
    });
    return docs.map((d) => ({ ...d, file: { ...d.file, size: Number(d.file.size) } }));
  }

  async updateDocument(
    organizationId: string,
    documentId: string,
    input: { fileId: string },
  ) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const file = await this.prisma.storedFile.findFirst({
      where: { id: input.fileId, organizationId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { fileId: input.fileId },
      select: {
        id: true,
        category: true,
        ownerType: true,
        ownerId: true,
        fileId: true,
        issuedOn: true,
        expiresOn: true,
        createdAt: true,
        file: { select: { mime: true, size: true } },
      },
    });
    return { ...updated, file: { ...updated.file, size: Number(updated.file.size) } };
  }

  async deleteDocument(organizationId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async downloadFile(organizationId: string, fileId: string) {
    const file = await this.prisma.storedFile.findFirst({
      where: { id: fileId, organizationId, deletedAt: null },
    });
    if (!file) throw new NotFoundException('File not found');

    const fileName = basename(file.key);
    const fullPath = join(this.uploadRoot, 'org', organizationId, fileName);
    try {
      await access(fullPath);
    } catch {
      throw new NotFoundException('File content missing on disk');
    }

    const stream = createReadStream(fullPath);
    return new StreamableFile(stream, {
      type: file.mime,
      disposition: `inline; filename="${fileName}"`,
    });
  }

  async listBeneficiaryTreeDocuments(organizationId: string, beneficiaryId: string) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, organizationId, deletedAt: null },
      include: {
        spouse: { where: { deletedAt: null }, select: { id: true } },
        children: { where: { deletedAt: null }, select: { id: true, firstNameEnc: true } },
        jobs: { where: { deletedAt: null }, select: { id: true } },
        housings: { where: { deletedAt: null }, select: { id: true, addressEnc: true } },
        diseases: { where: { deletedAt: null }, select: { id: true, name: true } },
        seriousIllnesses: { where: { deletedAt: null }, select: { id: true, name: true } },
        socialCoverages: { where: { deletedAt: null }, select: { id: true, type: true } },
      },
    });
    if (!ben) throw new NotFoundException('Beneficiary not found');

    type OwnerRef = { ownerType: DocumentOwnerType; ownerId: string; ownerLabel: string };
    const owners: OwnerRef[] = [
      { ownerType: 'beneficiary', ownerId: ben.id, ownerLabel: 'identity' },
    ];
    if (ben.spouse) owners.push({ ownerType: 'spouse', ownerId: ben.spouse.id, ownerLabel: 'spouse' });
    for (const c of ben.children) {
      owners.push({ ownerType: 'child', ownerId: c.id, ownerLabel: `child:${c.id.slice(0, 8)}` });
    }
    for (const j of ben.jobs) {
      owners.push({ ownerType: 'job', ownerId: j.id, ownerLabel: `job:${j.id.slice(0, 8)}` });
    }
    for (const h of ben.housings) {
      owners.push({ ownerType: 'housing', ownerId: h.id, ownerLabel: `housing:${h.id.slice(0, 8)}` });
    }
    for (const d of ben.diseases) {
      owners.push({
        ownerType: 'disease',
        ownerId: d.id,
        ownerLabel: d.name ? `disease:${d.name}` : `disease:${d.id.slice(0, 8)}`,
      });
    }
    for (const s of ben.seriousIllnesses) {
      owners.push({
        ownerType: 'serious_illness',
        ownerId: s.id,
        ownerLabel: s.name ? `illness:${s.name}` : `illness:${s.id.slice(0, 8)}`,
      });
    }
    for (const sc of ben.socialCoverages) {
      owners.push({
        ownerType: 'social_coverage',
        ownerId: sc.id,
        ownerLabel: `coverage:${sc.type}`,
      });
    }

    if (owners.length === 0) return [];

    const docs = await this.prisma.document.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: owners.map((o) => ({ ownerType: o.ownerType, ownerId: o.ownerId })),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        ownerType: true,
        ownerId: true,
        fileId: true,
        issuedOn: true,
        expiresOn: true,
        createdAt: true,
        file: { select: { mime: true, size: true } },
      },
    });

    const labelByKey = new Map(
      owners.map((o) => [`${o.ownerType}:${o.ownerId}`, o.ownerLabel]),
    );

    return docs.map((d) => ({
      ...d,
      ownerLabel: labelByKey.get(`${d.ownerType}:${d.ownerId}`) ?? d.ownerType,
      file: { ...d.file, size: Number(d.file.size) },
      issuedOn: d.issuedOn?.toISOString().slice(0, 10) ?? null,
      expiresOn: d.expiresOn?.toISOString().slice(0, 10) ?? null,
      createdAt: d.createdAt.toISOString(),
    }));
  }
}
