import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, extname } from 'path';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../config/env';
import type { DocumentCategory, DocumentOwnerType } from '@prisma/client';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

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
}
