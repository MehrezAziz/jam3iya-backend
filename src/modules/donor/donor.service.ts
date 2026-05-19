import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { z } from 'zod';

export const searchDonorsQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().positive().max(20).optional().default(10),
});
export type SearchDonorsQuery = z.infer<typeof searchDonorsQuerySchema>;

export const createDonorByOrgSchema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(8).max(40),
  password: z.string().min(8).max(200),
  email: z.string().email().optional(),
  fiscalId: z.string().max(80).optional(),
  acceptsTaxReceipt: z.boolean().optional(),
});
export type CreateDonorByOrgDto = z.infer<typeof createDonorByOrgSchema>;

@Injectable()
export class DonorService {
  constructor(private readonly prisma: PrismaService) {}

  async createByOrganization(organizationId: string, dto: CreateDonorByOrgDto) {
    const phone = dto.phone.replace(/\D/g, '');
    const email =
      dto.email?.toLowerCase() ??
      `donor+${phone}@donors.${organizationId.slice(0, 8)}.local`;

    const existingPhone = await this.prisma.user.findFirst({
      where: { organizationId, phone, deletedAt: null },
    });
    if (existingPhone) throw new ConflictException('A user with this phone already exists');

    const existingEmail = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email } },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          organizationId,
          kind: 'donor',
          email,
          fullName: dto.fullName,
          phone,
          passwordHash,
          status: 'active',
          lastPasswordChangeAt: new Date(),
        },
      });
      await tx.donor.create({
        data: {
          id: u.id,
          organizationId,
          acceptsTaxReceipt: dto.acceptsTaxReceipt ?? false,
          fiscalId: dto.fiscalId ?? null,
        },
      });
      return u;
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
    };
  }

  async search(organizationId: string, query: SearchDonorsQuery) {
    const term = query.q.trim();
    const digits = term.replace(/\D/g, '');
    const or: Prisma.UserWhereInput[] = [
      { fullName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ];
    if (digits.length >= 4) {
      or.push({ phone: { contains: digits } });
    }

    const rows = await this.prisma.user.findMany({
      where: {
        organizationId,
        kind: 'donor',
        deletedAt: null,
        OR: or,
      },
      take: query.limit,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        donorProfile: { select: { fiscalId: true, acceptsTaxReceipt: true } },
      },
    });

    return rows.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      fiscalId: u.donorProfile?.fiscalId ?? null,
      acceptsTaxReceipt: u.donorProfile?.acceptsTaxReceipt ?? false,
    }));
  }
}
