import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { HashService } from '../../common/crypto/hash.service';
import type {
  CreateBeneficiaryDto,
  UpdateBeneficiaryDto,
  ListBeneficiariesQuery,
  UpsertSpouseDto,
  UpsertChildDto,
  UpsertJobDto,
  UpsertHousingDto,
  UpsertDiseaseDto,
  UpsertSocialCoverageDto,
} from './dto';

@Injectable()
export class BeneficiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
    private readonly hash: HashService,
  ) {}

  async list(organizationId: string, query: ListBeneficiariesQuery) {
    const searchOr = query.q ? this.buildSearchOr(organizationId, query.q) : undefined;
    const where: Prisma.BeneficiaryWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.region ? { region: { equals: query.region } } : {}),
      ...(searchOr ? { OR: searchOr } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.beneficiary.count({ where }),
      this.prisma.beneficiary.findMany({
        where,
        select: {
          id: true,
          code: true,
          gender: true,
          status: true,
          region: true,
          city: true,
          publicAlias: true,
          createdAt: true,
          lastVerifiedAt: true,
          validUntil: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
    ]);
    return { total, items, limit: query.limit, offset: query.offset };
  }

  /** Search by beneficiary code, CIN, phone, or full name (exact hash match). */
  private buildSearchOr(organizationId: string, raw: string): Prisma.BeneficiaryWhereInput[] {
    const term = raw.trim();
    if (!term) return [];
    const or: Prisma.BeneficiaryWhereInput[] = [];

    if (term.length >= 2) {
      or.push({ code: { contains: term, mode: 'insensitive' } });
    }

    const cinDigits = term.replace(/\D/g, '');
    if (/^\d{8}$/.test(cinDigits)) {
      or.push({ cinHash: this.hash.hash(cinDigits, organizationId, 'cin') });
    }

    const phoneDigits = term.replace(/\D/g, '');
    if (phoneDigits.length >= 8) {
      or.push({ phoneHash: this.hash.hash(phoneDigits, organizationId, 'phone') });
      if (!phoneDigits.startsWith('216') && phoneDigits.length === 8) {
        or.push({ phoneHash: this.hash.hash(`216${phoneDigits}`, organizationId, 'phone') });
      }
    }

    or.push({ fullNameHash: this.hash.hash(term, organizationId, 'full_name') });
    const parts = term.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      or.push({
        fullNameHash: this.hash.hash(`${parts[0]} ${parts.slice(1).join(' ')}`, organizationId, 'full_name'),
      });
    }

    return or;
  }

  async create(organizationId: string, dto: CreateBeneficiaryDto): Promise<{ id: string; code: string }> {
    const year = new Date().getFullYear();
    const fullName = `${dto.firstName} ${dto.lastName}`;

    if (dto.cin) {
      const cinHash = this.hash.hash(dto.cin, organizationId, 'cin');
      const exists = await this.prisma.beneficiary.findFirst({
        where: { organizationId, cinHash, deletedAt: null },
        select: { id: true },
      });
      if (exists) throw new ConflictException('A beneficiary with this CIN already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.beneficiaryCounter.upsert({
        where: { organizationId_year: { organizationId, year } },
        create: { organizationId, year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const code = `PP-${year}-${String(counter.lastValue).padStart(5, '0')}`;

      const beneficiary = await tx.beneficiary.create({
        data: {
          organizationId,
          code,
          firstNameEnc: this.enc.encrypt(dto.firstName, organizationId, 'first_name'),
          lastNameEnc: this.enc.encrypt(dto.lastName, organizationId, 'last_name'),
          fullNameHash: this.hash.hash(fullName, organizationId, 'full_name'),
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          maritalStatus: dto.maritalStatus,
          cinEnc: dto.cin ? this.enc.encrypt(dto.cin, organizationId, 'cin') : null,
          cinHash: dto.cin ? this.hash.hash(dto.cin, organizationId, 'cin') : null,
          phoneEnc: dto.phone ? this.enc.encrypt(dto.phone, organizationId, 'phone') : null,
          phoneHash: dto.phone ? this.hash.hash(dto.phone, organizationId, 'phone') : null,
          addressEnc: dto.address ? this.enc.encrypt(dto.address, organizationId, 'address') : null,
          region: dto.region,
          city: dto.city,
          publicAlias: dto.publicAlias,
          status: 'draft',
        },
        select: { id: true, code: true },
      });

      // Open a case linked to the requested department
      await tx.case.create({
        data: {
          organizationId,
          beneficiaryId: beneficiary.id,
          departmentId: dto.departmentId,
          state: 'submitted',
          reason: dto.reason,
        },
      });
      return beneficiary;
    });
  }

  /**
   * Read the "summary" view (no decryption of HIGH-PII).
   */
  async readSummary(organizationId: string, id: string) {
    const b = await this.prisma.beneficiary.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        code: true,
        gender: true,
        status: true,
        maritalStatus: true,
        region: true,
        city: true,
        publicAlias: true,
        hasCnss: true,
        hasCnam: true,
        hasYellowNotebook: true,
        hasWhiteNotebook: true,
        hasMonthlyGrant: true,
        photoConsent: true,
        lastVerifiedAt: true,
        validUntil: true,
        createdAt: true,
        updatedAt: true,
        cases: {
          select: { id: true, state: true, departmentId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!b) throw new NotFoundException('Beneficiary not found');
    return b;
  }

  /**
   * Read the "full" view: decrypts PII-HIGH fields. The caller must have
   * `beneficiary.read.full` and a valid reason (enforced at controller).
   */
  async readFull(organizationId: string, id: string) {
    const b = await this.prisma.beneficiary.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!b) throw new NotFoundException('Beneficiary not found');

    return {
      id: b.id,
      code: b.code,
      firstName: this.enc.decryptToString(b.firstNameEnc, organizationId, 'first_name'),
      lastName: this.enc.decryptToString(b.lastNameEnc, organizationId, 'last_name'),
      gender: b.gender,
      dateOfBirth: b.dateOfBirth,
      maritalStatus: b.maritalStatus,
      cin: b.cinEnc ? this.enc.decryptToString(b.cinEnc, organizationId, 'cin') : null,
      phone: b.phoneEnc ? this.enc.decryptToString(b.phoneEnc, organizationId, 'phone') : null,
      address: b.addressEnc ? this.enc.decryptToString(b.addressEnc, organizationId, 'address') : null,
      region: b.region,
      city: b.city,
      publicAlias: b.publicAlias,
      status: b.status,
      lastVerifiedAt: b.lastVerifiedAt,
      validUntil: b.validUntil,
      createdAt: b.createdAt,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateBeneficiaryDto) {
    const existing = await this.prisma.beneficiary.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Beneficiary not found');

    const updates: Record<string, unknown> = {};
    if (dto.firstName !== undefined) {
      updates.firstNameEnc = this.enc.encrypt(dto.firstName, organizationId, 'first_name');
    }
    if (dto.lastName !== undefined) {
      updates.lastNameEnc = this.enc.encrypt(dto.lastName, organizationId, 'last_name');
    }
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const firstName = dto.firstName ?? this.enc.decryptToString(existing.firstNameEnc, organizationId, 'first_name');
      const lastName = dto.lastName ?? this.enc.decryptToString(existing.lastNameEnc, organizationId, 'last_name');
      updates.fullNameHash = this.hash.hash(`${firstName} ${lastName}`, organizationId, 'full_name');
    }
    if (dto.gender !== undefined) updates.gender = dto.gender;
    if (dto.maritalStatus !== undefined) updates.maritalStatus = dto.maritalStatus;
    if (dto.dateOfBirth !== undefined) updates.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.cin !== undefined) {
      updates.cinEnc = dto.cin ? this.enc.encrypt(dto.cin, organizationId, 'cin') : null;
      updates.cinHash = dto.cin ? this.hash.hash(dto.cin, organizationId, 'cin') : null;
    }
    if (dto.phone !== undefined) {
      updates.phoneEnc = dto.phone ? this.enc.encrypt(dto.phone, organizationId, 'phone') : null;
      updates.phoneHash = dto.phone ? this.hash.hash(dto.phone, organizationId, 'phone') : null;
    }
    if (dto.address !== undefined) {
      updates.addressEnc = dto.address ? this.enc.encrypt(dto.address, organizationId, 'address') : null;
    }
    if (dto.region !== undefined) updates.region = dto.region;
    if (dto.city !== undefined) updates.city = dto.city;
    if (dto.publicAlias !== undefined) updates.publicAlias = dto.publicAlias;
    if (dto.hasCnss !== undefined) updates.hasCnss = dto.hasCnss;
    if (dto.hasCnam !== undefined) updates.hasCnam = dto.hasCnam;
    if (dto.hasYellowNotebook !== undefined) updates.hasYellowNotebook = dto.hasYellowNotebook;
    if (dto.hasWhiteNotebook !== undefined) updates.hasWhiteNotebook = dto.hasWhiteNotebook;
    if (dto.hasMonthlyGrant !== undefined) updates.hasMonthlyGrant = dto.hasMonthlyGrant;
    if (dto.photoConsent !== undefined) updates.photoConsent = dto.photoConsent;

    await this.prisma.beneficiary.update({ where: { id }, data: updates });
    return { id, ok: true };
  }

  // ===== sub-resources ======================================================

  private async ensureOwned(organizationId: string, beneficiaryId: string) {
    const b = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!b) throw new NotFoundException('Beneficiary not found');
  }

  // --- Spouse (one per beneficiary) ----------------------------------------
  async getSpouse(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const s = await this.prisma.spouse.findUnique({ where: { beneficiaryId } });
    if (!s) return null;
    return {
      id: s.id,
      firstName: this.enc.decryptToString(s.firstNameEnc, organizationId, 'first_name'),
      lastName: this.enc.decryptToString(s.lastNameEnc, organizationId, 'last_name'),
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      cin: this.enc.decryptToString(s.cinEnc, organizationId, 'cin'),
      phone: s.phoneEnc ? this.enc.decryptToString(s.phoneEnc, organizationId, 'phone') : null,
      hasJob: s.hasJob,
      notes: s.notesEnc ? this.enc.decryptToString(s.notesEnc, organizationId, 'notes') : null,
    };
  }

  async upsertSpouse(organizationId: string, beneficiaryId: string, dto: UpsertSpouseDto) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const fullName = `${dto.firstName} ${dto.lastName}`;
    return this.prisma.spouse.upsert({
      where: { beneficiaryId },
      create: {
        beneficiaryId,
        firstNameEnc: this.enc.encrypt(dto.firstName, organizationId, 'first_name'),
        lastNameEnc: this.enc.encrypt(dto.lastName, organizationId, 'last_name'),
        fullNameHash: this.hash.hash(fullName, organizationId, 'full_name'),
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        cinEnc: this.enc.encrypt(dto.cin, organizationId, 'cin'),
        cinHash: this.hash.hash(dto.cin, organizationId, 'cin'),
        phoneEnc: dto.phone ? this.enc.encrypt(dto.phone, organizationId, 'phone') : null,
        hasJob: dto.hasJob ?? false,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      update: {
        firstNameEnc: this.enc.encrypt(dto.firstName, organizationId, 'first_name'),
        lastNameEnc: this.enc.encrypt(dto.lastName, organizationId, 'last_name'),
        fullNameHash: this.hash.hash(fullName, organizationId, 'full_name'),
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        cinEnc: this.enc.encrypt(dto.cin, organizationId, 'cin'),
        cinHash: this.hash.hash(dto.cin, organizationId, 'cin'),
        phoneEnc: dto.phone ? this.enc.encrypt(dto.phone, organizationId, 'phone') : null,
        hasJob: dto.hasJob ?? false,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
  }

  async deleteSpouse(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    await this.prisma.spouse.deleteMany({ where: { beneficiaryId } });
    return { ok: true };
  }

  // --- Children ------------------------------------------------------------
  async listChildren(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const list = await this.prisma.child.findMany({
      where: { beneficiaryId, deletedAt: null },
      orderBy: { dateOfBirth: 'asc' },
    });
    return list.map((c) => ({
      id: c.id,
      firstName: this.enc.decryptToString(c.firstNameEnc, organizationId, 'first_name'),
      lastName: this.enc.decryptToString(c.lastNameEnc, organizationId, 'last_name'),
      gender: c.gender,
      dateOfBirth: c.dateOfBirth,
      inSchool: c.inSchool,
      schoolLevel: c.schoolLevel,
      schoolLevelUpdatedAt: c.schoolLevelUpdatedAt,
      schoolName: c.schoolName,
      works: c.works,
      jobDescription: c.jobDescriptionEnc
        ? this.enc.decryptToString(c.jobDescriptionEnc, organizationId, 'notes')
        : null,
      hasDisability: c.hasDisability,
      disabilityNotes: c.disabilityNotesEnc
        ? this.enc.decryptToString(c.disabilityNotesEnc, organizationId, 'notes')
        : null,
      notes: c.notesEnc ? this.enc.decryptToString(c.notesEnc, organizationId, 'notes') : null,
    }));
  }

  async addChild(organizationId: string, beneficiaryId: string, dto: UpsertChildDto) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const fullName = `${dto.firstName} ${dto.lastName}`;
    const child = await this.prisma.child.create({
      data: {
        beneficiaryId,
        firstNameEnc: this.enc.encrypt(dto.firstName, organizationId, 'first_name'),
        lastNameEnc: this.enc.encrypt(dto.lastName, organizationId, 'last_name'),
        fullNameHash: this.hash.hash(fullName, organizationId, 'full_name'),
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        inSchool: dto.inSchool ?? false,
        schoolLevel: dto.schoolLevel ?? 'none',
        schoolLevelUpdatedAt: dto.schoolLevelUpdatedAt
          ? new Date(dto.schoolLevelUpdatedAt)
          : dto.schoolLevel && dto.schoolLevel !== 'none'
            ? new Date()
            : null,
        schoolName: dto.schoolName ?? null,
        works: dto.works ?? false,
        jobDescriptionEnc: dto.jobDescription
          ? this.enc.encrypt(dto.jobDescription, organizationId, 'notes')
          : null,
        hasDisability: dto.hasDisability ?? false,
        disabilityNotesEnc: dto.disabilityNotes
          ? this.enc.encrypt(dto.disabilityNotes, organizationId, 'notes')
          : null,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
    return child;
  }

  async updateChild(
    organizationId: string,
    beneficiaryId: string,
    childId: string,
    dto: UpsertChildDto,
  ) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const existing = await this.prisma.child.findFirst({
      where: { id: childId, beneficiaryId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Child not found');

    const fullName = `${dto.firstName} ${dto.lastName}`;
    return this.prisma.child.update({
      where: { id: childId },
      data: {
        firstNameEnc: this.enc.encrypt(dto.firstName, organizationId, 'first_name'),
        lastNameEnc: this.enc.encrypt(dto.lastName, organizationId, 'last_name'),
        fullNameHash: this.hash.hash(fullName, organizationId, 'full_name'),
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        inSchool: dto.inSchool ?? false,
        schoolLevel: dto.schoolLevel ?? 'none',
        schoolLevelUpdatedAt:
          dto.schoolLevelUpdatedAt != null
            ? new Date(dto.schoolLevelUpdatedAt)
            : dto.schoolLevel && dto.schoolLevel !== existing.schoolLevel
              ? new Date()
              : existing.schoolLevelUpdatedAt,
        schoolName: dto.schoolName ?? null,
        works: dto.works ?? false,
        jobDescriptionEnc: dto.jobDescription
          ? this.enc.encrypt(dto.jobDescription, organizationId, 'notes')
          : null,
        hasDisability: dto.hasDisability ?? false,
        disabilityNotesEnc: dto.disabilityNotes
          ? this.enc.encrypt(dto.disabilityNotes, organizationId, 'notes')
          : null,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
  }

  async deleteChild(organizationId: string, beneficiaryId: string, childId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    await this.prisma.child.deleteMany({ where: { id: childId, beneficiaryId } });
    return { ok: true };
  }

  // --- Social coverage -----------------------------------------------------
  async listSocialCoverages(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const rows = await this.prisma.socialCoverage.findMany({
      where: { beneficiaryId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((s) => ({
      id: s.id,
      type: s.type,
      identifier: s.identifierEnc
        ? this.enc.decryptToString(s.identifierEnc, organizationId, 'notes')
        : null,
      monthlyAmountMinor: s.monthlyAmountMinorEnc
        ? Number(this.enc.decryptToString(s.monthlyAmountMinorEnc, organizationId, 'notes'))
        : null,
      currency: s.currency,
      validFrom: s.validFrom,
      validUntil: s.validUntil,
      notes: s.notesEnc ? this.enc.decryptToString(s.notesEnc, organizationId, 'notes') : null,
    }));
  }

  async addSocialCoverage(
    organizationId: string,
    beneficiaryId: string,
    dto: UpsertSocialCoverageDto,
  ) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const monthlyMinor =
      dto.monthlyAmount != null ? Math.round(dto.monthlyAmount * 1000) : null;
    const row = await this.prisma.socialCoverage.create({
      data: {
        beneficiaryId,
        type: dto.type,
        identifierEnc: dto.identifier
          ? this.enc.encrypt(dto.identifier, organizationId, 'notes')
          : null,
        monthlyAmountMinorEnc:
          monthlyMinor != null
            ? this.enc.encrypt(String(monthlyMinor), organizationId, 'notes')
            : null,
        currency: (dto.currency ?? 'TND').toUpperCase(),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
    return row;
  }

  async deleteSocialCoverage(
    organizationId: string,
    beneficiaryId: string,
    coverageId: string,
  ) {
    await this.ensureOwned(organizationId, beneficiaryId);
    await this.prisma.socialCoverage.updateMany({
      where: { id: coverageId, beneficiaryId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // --- Jobs (current employment) -------------------------------------------
  async listJobs(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const spouse = await this.prisma.spouse.findUnique({
      where: { beneficiaryId },
      select: { id: true },
    });
    const jobs = await this.prisma.job.findMany({
      where: {
        deletedAt: null,
        OR: [
          { beneficiaryId },
          ...(spouse ? [{ spouseId: spouse.id }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map((j) => ({
      id: j.id,
      subjectType: j.subjectType,
      title: this.enc.decryptToString(j.titleEnc, organizationId, 'notes'),
      employer: j.employerEnc ? this.enc.decryptToString(j.employerEnc, organizationId, 'notes') : null,
      place: j.placeEnc ? this.enc.decryptToString(j.placeEnc, organizationId, 'notes') : null,
      schedule: j.schedule,
      salaryMinor: j.salaryMinorEnc ? Number(this.enc.decryptToString(j.salaryMinorEnc, organizationId, 'notes')) : null,
      currency: j.currency,
      isRegistered: j.isRegistered,
      startDate: j.startDate,
      endDate: j.endDate,
      notes: j.notesEnc ? this.enc.decryptToString(j.notesEnc, organizationId, 'notes') : null,
    }));
  }

  async addJob(organizationId: string, beneficiaryId: string, dto: UpsertJobDto) {
    await this.ensureOwned(organizationId, beneficiaryId);
    let spouseId: string | null = null;
    if (dto.subjectType === 'spouse') {
      const s = await this.prisma.spouse.findUnique({
        where: { beneficiaryId },
        select: { id: true },
      });
      if (!s) throw new NotFoundException('Spouse must be created before adding a spouse job');
      spouseId = s.id;
    }

    const salaryMinor = dto.salary != null ? Math.round(dto.salary * 1000) : null;

    return this.prisma.job.create({
      data: {
        subjectType: dto.subjectType,
        beneficiaryId: dto.subjectType === 'beneficiary' ? beneficiaryId : null,
        spouseId,
        titleEnc: this.enc.encrypt(dto.title, organizationId, 'notes'),
        employerEnc: dto.employer ? this.enc.encrypt(dto.employer, organizationId, 'notes') : null,
        placeEnc: dto.place ? this.enc.encrypt(dto.place, organizationId, 'notes') : null,
        schedule: dto.schedule ?? null,
        salaryMinorEnc:
          salaryMinor != null ? this.enc.encrypt(String(salaryMinor), organizationId, 'notes') : null,
        currency: 'TND',
        isRegistered: dto.isRegistered ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
  }

  async deleteJob(organizationId: string, beneficiaryId: string, jobId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const j = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        OR: [{ beneficiaryId }, { spouse: { beneficiaryId } }],
      },
      select: { id: true },
    });
    if (!j) throw new NotFoundException('Job not found');
    await this.prisma.job.delete({ where: { id: jobId } });
    return { ok: true };
  }

  // --- Housing -------------------------------------------------------------
  async listHousing(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const list = await this.prisma.housing.findMany({
      where: { beneficiaryId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((h) => ({
      id: h.id,
      tenure: h.tenure,
      rentMinor: h.rentMinorEnc ? Number(this.enc.decryptToString(h.rentMinorEnc, organizationId, 'notes')) : null,
      currency: h.currency,
      ownerName: h.ownerNameEnc ? this.enc.decryptToString(h.ownerNameEnc, organizationId, 'notes') : null,
      ownerPhone: h.ownerPhoneEnc ? this.enc.decryptToString(h.ownerPhoneEnc, organizationId, 'notes') : null,
      condition: h.condition,
      rooms: h.rooms,
      occupants: h.occupants,
      hasElectricity: h.hasElectricity,
      hasRunningWater: h.hasRunningWater,
      address: h.addressEnc ? this.enc.decryptToString(h.addressEnc, organizationId, 'address') : null,
      notes: h.notesEnc ? this.enc.decryptToString(h.notesEnc, organizationId, 'notes') : null,
    }));
  }

  async addHousing(organizationId: string, beneficiaryId: string, dto: UpsertHousingDto) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const rentMinor = dto.rent != null ? Math.round(dto.rent * 1000) : null;
    return this.prisma.housing.create({
      data: {
        beneficiaryId,
        tenure: dto.tenure,
        rentMinorEnc:
          rentMinor != null ? this.enc.encrypt(String(rentMinor), organizationId, 'notes') : null,
        currency: 'TND',
        ownerNameEnc: dto.ownerName ? this.enc.encrypt(dto.ownerName, organizationId, 'notes') : null,
        ownerPhoneEnc: dto.ownerPhone ? this.enc.encrypt(dto.ownerPhone, organizationId, 'notes') : null,
        condition: dto.condition ?? 'fair',
        rooms: dto.rooms ?? null,
        occupants: dto.occupants ?? null,
        hasElectricity: dto.hasElectricity ?? true,
        hasRunningWater: dto.hasRunningWater ?? true,
        addressEnc: dto.address ? this.enc.encrypt(dto.address, organizationId, 'address') : null,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
  }

  async deleteHousing(organizationId: string, beneficiaryId: string, housingId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    await this.prisma.housing.deleteMany({ where: { id: housingId, beneficiaryId } });
    return { ok: true };
  }

  // --- Diseases ------------------------------------------------------------
  async listDiseases(organizationId: string, beneficiaryId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const list = await this.prisma.disease.findMany({
      where: { beneficiaryId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((d) => ({
      id: d.id,
      name: d.name,
      nameFree: d.nameEnc ? this.enc.decryptToString(d.nameEnc, organizationId, 'notes') : null,
      diagnosisDate: d.diagnosisDate,
      monthlyCostMinor: d.monthlyCostMinorEnc
        ? Number(this.enc.decryptToString(d.monthlyCostMinorEnc, organizationId, 'notes'))
        : null,
      currency: d.currency,
      status: d.status,
      needsMedication: d.needsMedication,
      needsMonitoring: d.needsMonitoring,
      notes: d.notesEnc ? this.enc.decryptToString(d.notesEnc, organizationId, 'notes') : null,
    }));
  }

  async addDisease(organizationId: string, beneficiaryId: string, dto: UpsertDiseaseDto) {
    await this.ensureOwned(organizationId, beneficiaryId);
    const monthlyCostMinor = dto.monthlyCost != null ? Math.round(dto.monthlyCost * 1000) : null;
    return this.prisma.disease.create({
      data: {
        beneficiaryId,
        name: dto.name ?? null,
        nameEnc: dto.nameFree ? this.enc.encrypt(dto.nameFree, organizationId, 'notes') : null,
        diagnosisDate: dto.diagnosisDate ? new Date(dto.diagnosisDate) : null,
        monthlyCostMinorEnc:
          monthlyCostMinor != null
            ? this.enc.encrypt(String(monthlyCostMinor), organizationId, 'notes')
            : null,
        currency: 'TND',
        status: dto.status ?? 'active',
        needsMedication: dto.needsMedication ?? false,
        needsMonitoring: dto.needsMonitoring ?? false,
        notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
      },
      select: { id: true },
    });
  }

  async deleteDisease(organizationId: string, beneficiaryId: string, diseaseId: string) {
    await this.ensureOwned(organizationId, beneficiaryId);
    await this.prisma.disease.deleteMany({ where: { id: diseaseId, beneficiaryId } });
    return { ok: true };
  }
}
