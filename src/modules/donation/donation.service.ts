import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createCashDonationSchema = z
  .object({
    amount: z.number().int().positive(),
    currency: z.string().length(3).default('TND'),
    donorId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
    occasionId: z.string().uuid().optional(),
    spendCategory: z
      .string()
      .max(80)
      .transform((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
      .optional(),
    /** ISO datetime or YYYY-MM-DD (start of local day). */
    receivedAt: z.union([z.string().datetime(), dateOnly]).optional(),
    donorNameSnapshot: z.string().max(200).optional(),
    donorFiscalIdSnapshot: z.string().max(80).optional(),
    notes: z.string().max(2000).optional(),
    isAnonymous: z.boolean().optional(),
  })
  .refine((d) => !(d.campaignId && d.spendCategory), {
    message: 'campaignId and spendCategory are mutually exclusive',
    path: ['spendCategory'],
  });
export type CreateCashDonationDto = z.infer<typeof createCashDonationSchema>;

export const listDonationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  kind: z.enum(['cash', 'card', 'bank_transfer', 'gateway', 'in_kind']).optional(),
  campaignId: z.string().uuid().optional(),
  campaignIds: z.preprocess(
    (v) => (v == null || v === '' ? undefined : Array.isArray(v) ? v : [v]),
    z.array(z.string().uuid()).optional(),
  ),
  spendCategory: z.string().max(80).optional(),
  spendCategories: z.preprocess(
    (v) => (v == null || v === '' ? undefined : Array.isArray(v) ? v : [v]),
    z.array(z.string().max(80)).optional(),
  ),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});
export type ListDonationsQuery = z.infer<typeof listDonationsQuerySchema>;

export const createInKindDonationSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().max(40),
  estimatedValue: z.number().int().positive().optional(),
  currency: z.string().length(3).default('TND'),
  donorId: z.string().uuid().optional(),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  supplierName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateInKindDonationDto = z.infer<typeof createInKindDonationSchema>;

function parseReceivedAt(input?: string): Date {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  if (!input) return now;

  const received =
    input.length === 10
      ? new Date(`${input}T12:00:00.000Z`)
      : new Date(input);

  if (Number.isNaN(received.getTime())) {
    throw new BadRequestException('Invalid receivedAt date');
  }
  if (received > todayEnd) {
    throw new BadRequestException('receivedAt cannot be in the future');
  }
  if (received < weekAgo) {
    throw new BadRequestException('receivedAt cannot be more than 7 days in the past');
  }
  return received;
}

@Injectable()
export class DonationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  async list(organizationId: string, query: ListDonationsQuery) {
    const where: Prisma.DonationWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.campaignIds?.length
        ? { campaignId: { in: query.campaignIds } }
        : query.campaignId
          ? { campaignId: query.campaignId }
          : {}),
      ...(query.spendCategories?.length
        ? { spendCategory: { in: query.spendCategories } }
        : query.spendCategory
          ? { spendCategory: query.spendCategory }
          : {}),
      ...(query.from || query.to
        ? {
            receivedAt: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          kind: true,
          amountMinor: true,
          currency: true,
          receivedAt: true,
          donorId: true,
          campaignId: true,
          occasionId: true,
          spendCategory: true,
          isAnonymous: true,
          donorNameSnapshot: true,
          notesEnc: true,
          campaign: { select: { name: true } },
        },
      }),
    ]);

    const items = rows.map((d) => ({
      id: d.id,
      kind: d.kind,
      amountMinor: Number(d.amountMinor),
      currency: d.currency,
      receivedAt: d.receivedAt,
      donorId: d.donorId,
      campaignId: d.campaignId,
      campaignName: d.campaign?.name ?? null,
      occasionId: d.occasionId,
      spendCategory: d.spendCategory,
      isAnonymous: d.isAnonymous,
      donorNameSnapshot: d.donorNameSnapshot,
      notes: d.notesEnc
        ? this.enc.decryptToString(d.notesEnc, organizationId, 'notes')
        : null,
    }));

    return { total, items, limit: query.limit, offset: query.offset };
  }

  async createCash(organizationId: string, receivedById: string | null, dto: CreateCashDonationDto) {
    if (dto.donorId) {
      const donor = await this.prisma.donor.findFirst({ where: { id: dto.donorId, organizationId } });
      if (!donor) throw new NotFoundException('Donor not found in this organization');
    }
    if (!dto.donorId && !dto.donorNameSnapshot && !dto.isAnonymous) {
      throw new BadRequestException('Provide a donor account, a name snapshot, or mark donation as anonymous.');
    }

    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: dto.campaignId, organizationId, deletedAt: null },
        select: { id: true, state: true },
      });
      if (!campaign) throw new NotFoundException('Campaign not found');
      if (campaign.state === 'closed') {
        throw new BadRequestException('Cannot donate to a closed campaign');
      }
    }

    const receivedAt = parseReceivedAt(dto.receivedAt);
    const amountMinor = BigInt(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          organizationId,
          kind: 'cash',
          amountMinor,
          currency: dto.currency.toUpperCase(),
          donorId: dto.donorId ?? null,
          campaignId: dto.campaignId ?? null,
          occasionId: dto.occasionId ?? null,
          spendCategory: dto.spendCategory ?? null,
          receivedAt,
          receivedById,
          isAnonymous: dto.isAnonymous ?? !dto.donorId,
          donorNameSnapshot: dto.donorNameSnapshot ?? null,
          donorFiscalIdSnapshot: dto.donorFiscalIdSnapshot ?? null,
          notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
        },
      });

      await tx.payment.create({
        data: {
          donationId: donation.id,
          provider: 'manual_cash',
          amountMinor,
          currency: dto.currency.toUpperCase(),
          status: 'succeeded',
          idempotencyKey: `cash-${donation.id}`,
          completedAt: new Date(),
          cashReceivedById: receivedById ?? undefined,
        },
      });

      if (dto.campaignId) {
        await tx.campaign.update({
          where: { id: dto.campaignId },
          data: { collectedAmountMinor: { increment: amountMinor } },
        });
      }

      return donation;
    });
  }

  async createInKind(organizationId: string, receivedById: string | null, dto: CreateInKindDonationDto) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, organizationId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.stockLot.create({
        data: {
          itemId: item.id,
          receivedAt: new Date(),
          expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : null,
          quantityInitial: dto.quantity,
          quantityRemaining: dto.quantity,
          unitCostMinor: dto.estimatedValue ? BigInt(dto.estimatedValue) : null,
          currency: dto.currency.toUpperCase(),
          supplierName: dto.supplierName ?? null,
        },
      });
      await tx.stockMovement.create({
        data: {
          lotId: lot.id,
          type: 'in',
          quantity: dto.quantity,
          reason: 'donation',
          performedById: receivedById ?? undefined,
        },
      });
      const donation = await tx.donation.create({
        data: {
          organizationId,
          kind: 'in_kind',
          amountMinor: BigInt(0),
          currency: dto.currency.toUpperCase(),
          donorId: dto.donorId ?? null,
          inKindItemId: item.id,
          inKindLotId: lot.id,
          inKindQuantity: dto.quantity,
          inKindUnit: dto.unit,
          inKindEstValueMinor: dto.estimatedValue ? BigInt(dto.estimatedValue) : null,
          receivedAt: new Date(),
          receivedById,
          isAnonymous: !dto.donorId,
          notesEnc: dto.notes ? this.enc.encrypt(dto.notes, organizationId, 'notes') : null,
        },
      });
      return { donation, lot };
    });
  }

  async listMine(userId: string, limit = 50, offset = 0) {
    const where = { donorId: userId, deletedAt: null } as const;
    const [total, items] = await Promise.all([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
        select: {
          id: true,
          organizationId: true,
          kind: true,
          amountMinor: true,
          currency: true,
          receivedAt: true,
          isAnonymous: true,
          campaignId: true,
          occasionId: true,
          spendCategory: true,
          inKindQuantity: true,
          inKindUnit: true,
          inKindEstValueMinor: true,
          organization: { select: { legalName: true, slug: true } },
        },
      }),
    ]);

    const totalGivenAgg = await this.prisma.donation.groupBy({
      by: ['currency'],
      where: { donorId: userId, deletedAt: null, kind: { not: 'in_kind' } },
      _sum: { amountMinor: true },
    });
    const totalGiven = totalGivenAgg.map((g) => ({
      currency: g.currency,
      amountMinor: Number(g._sum.amountMinor ?? 0n),
    }));

    return {
      total,
      items: items.map((d) => ({
        ...d,
        amountMinor: Number(d.amountMinor),
        inKindEstValueMinor: d.inKindEstValueMinor != null ? Number(d.inKindEstValueMinor) : null,
      })),
      limit,
      offset,
      totalGiven,
    };
  }

  async listMyReceipts(userId: string) {
    const items = await this.prisma.bill.findMany({
      where: {
        recipientType: 'donor',
        recipientId: userId,
        deletedAt: null,
      },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        number: true,
        series: true,
        issuedAt: true,
        totalMinor: true,
        currency: true,
        organizationId: true,
        isTaxReceipt: true,
        linkedDonationId: true,
        pdfFileId: true,
        organization: { select: { legalName: true, slug: true } },
      },
    });
    return items.map((b) => ({ ...b, totalMinor: Number(b.totalMinor) }));
  }

  async stats(organizationId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [donationsAgg, distributionsAgg, beneficiariesCount, openCases, monthlyDonations, monthlyDistributions] =
      await Promise.all([
        this.prisma.donation.aggregate({
          where: { organizationId, deletedAt: null, receivedAt: { gte: startOfMonth }, kind: { not: 'in_kind' } },
          _sum: { amountMinor: true },
          _count: true,
        }),
        this.prisma.distribution.aggregate({
          where: { organizationId, deletedAt: null, deliveredAt: { gte: startOfMonth }, status: 'delivered' },
          _count: true,
        }),
        this.prisma.beneficiary.count({
          where: { organizationId, deletedAt: null, status: 'active' },
        }),
        this.prisma.case.count({
          where: { organizationId, deletedAt: null, state: { in: ['submitted', 'under_review'] } },
        }),
        this.prisma.donation.findMany({
          where: {
            organizationId,
            deletedAt: null,
            receivedAt: { gte: startOfYear },
            kind: { not: 'in_kind' },
          },
          select: { receivedAt: true, amountMinor: true },
        }),
        this.prisma.distribution.findMany({
          where: {
            organizationId,
            deletedAt: null,
            deliveredAt: { gte: startOfYear, not: null },
            status: 'delivered',
          },
          select: {
            deliveredAt: true,
            lines: { where: { lineKind: 'cash' }, select: { amountMinor: true } },
          },
        }),
      ]);

    const distCashMonth = await this.prisma.distributionLine.aggregate({
      where: {
        lineKind: 'cash',
        distribution: {
          organizationId,
          deletedAt: null,
          status: 'delivered',
          deliveredAt: { gte: startOfMonth },
        },
      },
      _sum: { amountMinor: true },
    });

    const donationsByMonth = this.groupByMonth(
      monthlyDonations.map((d) => ({
        at: d.receivedAt,
        amountMinor: Number(d.amountMinor),
      })),
    );

    const distributionsByMonth = this.groupByMonth(
      monthlyDistributions.flatMap((d) => {
        const sum = d.lines.reduce((acc, l) => acc + Number(l.amountMinor ?? 0), 0);
        return d.deliveredAt ? [{ at: d.deliveredAt, amountMinor: sum }] : [];
      }),
    );

    return {
      month: {
        donationsCount: donationsAgg._count,
        donationsSumMinor: Number(donationsAgg._sum.amountMinor ?? 0n),
        distributionsCount: distributionsAgg._count,
        distributionsSumMinor: Number(distCashMonth._sum.amountMinor ?? 0n),
      },
      donationsByMonth,
      distributionsByMonth,
      currentActiveBeneficiaries: beneficiariesCount,
      openCases,
    };
  }

  private groupByMonth(rows: { at: Date; amountMinor: number }[]) {
    const map = new Map<string, { month: string; count: number; sumMinor: number }>();
    for (const row of rows) {
      const key = `${row.at.getFullYear()}-${String(row.at.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) ?? { month: key, count: 0, sumMinor: 0 };
      cur.count += 1;
      cur.sumMinor += row.amountMinor;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }
}
