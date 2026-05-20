import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { TreasuryService } from '../treasury/treasury.service';
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
  departmentId: z.string().uuid().optional(),
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
    private readonly treasury: TreasuryService,
  ) {}

  async list(
    organizationId: string,
    query: ListDonationsQuery,
    scopeDepartmentId?: string,
  ) {
    const departmentId = scopeDepartmentId ?? query.departmentId;
    let donationDeptFilter: Prisma.DonationWhereInput = {};
    if (departmentId) {
      const receiverIds = await this.treasury.userIdsForDepartment(organizationId, departmentId);
      donationDeptFilter = this.treasury.donationWhereForDepartment(
        organizationId,
        departmentId,
        receiverIds,
      );
    }

    const where: Prisma.DonationWhereInput = {
      ...(departmentId ? donationDeptFilter : { organizationId, deletedAt: null }),
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
          receivedById: true,
          departmentId: true,
          notesEnc: true,
          campaign: { select: { name: true } },
          department: { select: { id: true, name: true } },
          bills: {
            where: { deletedAt: null, status: 'issued' },
            take: 1,
            orderBy: { issuedAt: 'desc' },
            select: { id: true, number: true, series: true, yearIssued: true },
          },
        },
      }),
    ]);

    const receiverIds = [
      ...new Set(rows.map((r) => r.receivedById).filter((id): id is string => !!id)),
    ];
    const deptByReceiver = new Map<string, { id: string; name: string }>();
    if (receiverIds.length > 0) {
      const assignments = await this.prisma.userDepartmentRole.findMany({
        where: { userId: { in: receiverIds }, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          userId: true,
          department: { select: { id: true, name: true } },
        },
      });
      for (const a of assignments) {
        if (!deptByReceiver.has(a.userId)) {
          deptByReceiver.set(a.userId, a.department);
        }
      }
    }

    const items = rows.map((row) => {
      const dept =
        row.department ??
        (row.receivedById ? (deptByReceiver.get(row.receivedById) ?? null) : null);
      return {
      id: row.id,
      kind: row.kind,
      amountMinor: Number(row.amountMinor),
      currency: row.currency,
      receivedAt: row.receivedAt,
      donorId: row.donorId,
      campaignId: row.campaignId,
      campaignName: row.campaign?.name ?? null,
      occasionId: row.occasionId,
      spendCategory: row.spendCategory,
      isAnonymous: row.isAnonymous,
      donorNameSnapshot: row.donorNameSnapshot,
      departmentId: dept?.id ?? null,
      departmentName: dept?.name ?? null,
      notes: row.notesEnc
        ? this.enc.decryptToString(row.notesEnc, organizationId, 'notes')
        : null,
      receiptBill: row.bills[0]
        ? {
            id: row.bills[0].id,
            number: row.bills[0].number,
            series: row.bills[0].series,
            yearIssued: row.bills[0].yearIssued,
          }
        : null,
      };
    });

    return { total, items, limit: query.limit, offset: query.offset };
  }

  async createCash(
    organizationId: string,
    receivedById: string | null,
    userDepartmentId: string | undefined,
    dto: CreateCashDonationDto,
  ) {
    const departmentId = await this.treasury.resolveDonationDepartmentId(
      organizationId,
      userDepartmentId,
      receivedById,
    );
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
          departmentId,
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

      return {
        id: donation.id,
        kind: donation.kind,
        amountMinor: Number(donation.amountMinor),
        currency: donation.currency,
        receivedAt: donation.receivedAt.toISOString(),
        campaignId: donation.campaignId,
        spendCategory: donation.spendCategory,
      };
    });
  }

  async listByCampaign(organizationId: string, campaignId: string, limit = 50) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const rows = await this.prisma.donation.findMany({
      where: { organizationId, campaignId, deletedAt: null },
      orderBy: { receivedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        kind: true,
        amountMinor: true,
        currency: true,
        receivedAt: true,
        isAnonymous: true,
        donorNameSnapshot: true,
        spendCategory: true,
      },
    });

    return {
      campaign,
      items: rows.map((d) => ({
        ...d,
        amountMinor: Number(d.amountMinor),
        receivedAt: d.receivedAt.toISOString(),
      })),
    };
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

  canViewOrgTreasury(organizationId: string, userId: string) {
    return this.treasury.userHasMainDepartmentAccess(organizationId, userId);
  }

  async stats(
    organizationId: string,
    scopeDepartmentId?: string,
    includeDepartmentBreakdown = false,
    viewerDepartmentId?: string,
    userId?: string,
  ) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let balanceDeptId = scopeDepartmentId ?? viewerDepartmentId;
    if (!balanceDeptId && includeDepartmentBreakdown) {
      balanceDeptId = (await this.treasury.getMainDepartmentId(organizationId)) ?? undefined;
    }
    const balancePromise = balanceDeptId
      ? this.treasury.getDepartmentBalance(organizationId, balanceDeptId)
      : null;

    const donationBase: Prisma.DonationWhereInput = scopeDepartmentId
      ? await this.scopedDonationWhere(organizationId, scopeDepartmentId)
      : { organizationId, deletedAt: null, cancelledAt: null, kind: { not: 'in_kind' } };

    const distBase = scopeDepartmentId
      ? {
          organizationId,
          deletedAt: null,
          status: 'delivered' as const,
          beneficiary: { primaryDepartmentId: scopeDepartmentId },
        }
      : {
          organizationId,
          deletedAt: null,
          status: 'delivered' as const,
        };

    const beneficiaryWhere = scopeDepartmentId
      ? { organizationId, deletedAt: null, status: 'active' as const, primaryDepartmentId: scopeDepartmentId }
      : { organizationId, deletedAt: null, status: 'active' as const };

    const caseWhere: Prisma.CaseWhereInput = scopeDepartmentId
      ? {
          organizationId,
          deletedAt: null,
          state: { in: ['submitted', 'under_review'] },
          departmentId: scopeDepartmentId,
        }
      : {
          organizationId,
          deletedAt: null,
          state: { in: ['submitted', 'under_review'] },
        };

    const [donationsAgg, distributionsAgg, beneficiariesCount, openCases, monthlyDonations, monthlyDistributions] =
      await Promise.all([
        this.prisma.donation.aggregate({
          where: { ...donationBase, receivedAt: { gte: startOfMonth } },
          _sum: { amountMinor: true },
          _count: true,
        }),
        this.prisma.distribution.aggregate({
          where: { ...distBase, deliveredAt: { gte: startOfMonth } },
          _count: true,
        }),
        this.prisma.beneficiary.count({ where: beneficiaryWhere }),
        this.prisma.case.count({ where: caseWhere }),
        this.prisma.donation.findMany({
          where: { ...donationBase, receivedAt: { gte: startOfYear } },
          select: { receivedAt: true, amountMinor: true },
        }),
        this.prisma.distribution.findMany({
          where: { ...distBase, deliveredAt: { gte: startOfYear, not: null } },
          select: {
            deliveredAt: true,
            lines: { where: { lineKind: 'cash' }, select: { amountMinor: true } },
          },
        }),
      ]);

    const distCashMonth = await this.prisma.distributionLine.aggregate({
      where: {
        lineKind: 'cash',
        distribution: { ...distBase, deliveredAt: { gte: startOfMonth } },
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

    const balance = balancePromise ? await balancePromise : null;

    let departmentSeries: Array<{
      departmentId: string;
      departmentName: string;
      donationsByMonth: ReturnType<DonationService['groupByMonth']>;
      distributionsByMonth: ReturnType<DonationService['groupByMonth']>;
      availableBalanceMinor: number;
    }> | undefined;

    if (includeDepartmentBreakdown) {
      const depts = await this.prisma.department.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      departmentSeries = await Promise.all(
        depts.map(async (dept) => {
          const deptDonationWhere = await this.scopedDonationWhere(organizationId, dept.id);
          const [deptDonations, deptDists, deptBalance] = await Promise.all([
            this.prisma.donation.findMany({
              where: { ...deptDonationWhere, receivedAt: { gte: startOfYear } },
              select: { receivedAt: true, amountMinor: true },
            }),
            this.prisma.distribution.findMany({
              where: {
                organizationId,
                deletedAt: null,
                status: 'delivered',
                deliveredAt: { gte: startOfYear, not: null },
                beneficiary: { primaryDepartmentId: dept.id },
              },
              select: {
                deliveredAt: true,
                lines: { where: { lineKind: 'cash' }, select: { amountMinor: true } },
              },
            }),
            this.treasury.getDepartmentBalance(organizationId, dept.id),
          ]);
          return {
            departmentId: dept.id,
            departmentName: dept.name,
            donationsByMonth: this.groupByMonth(
              deptDonations.map((d) => ({ at: d.receivedAt, amountMinor: Number(d.amountMinor) })),
            ),
            distributionsByMonth: this.groupByMonth(
              deptDists.flatMap((d) => {
                const sum = d.lines.reduce((acc, l) => acc + Number(l.amountMinor ?? 0), 0);
                return d.deliveredAt ? [{ at: d.deliveredAt, amountMinor: sum }] : [];
              }),
            ),
            availableBalanceMinor: deptBalance.availableBalanceMinor,
          };
        }),
      );
    }

    const orgBalances = includeDepartmentBreakdown
      ? await this.treasury.listAllBalances(organizationId)
      : undefined;

    return {
      scopeDepartmentId: scopeDepartmentId ?? null,
      scopeDepartmentName: balance?.departmentName ?? null,
      availableBalanceMinor: balance?.availableBalanceMinor ?? 0,
      totalDonationsMinor: balance?.donationsMinor ?? 0,
      totalDistributionsCashMinor: balance?.distributionsCashMinor ?? 0,
      canManageTransfers: userId
        ? await this.treasury.userHasMainDepartmentAccess(organizationId, userId)
        : false,
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
      departmentSeries,
      departmentBalances: orgBalances,
    };
  }

  private async scopedDonationWhere(organizationId: string, departmentId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId, deletedAt: null },
      select: { isMain: true },
    });
    const receiverIds = await this.treasury.userIdsForDepartment(organizationId, departmentId);
    return this.treasury.donationWhereForDepartment(
      organizationId,
      departmentId,
      receiverIds,
      dept?.isMain ?? false,
    );
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
