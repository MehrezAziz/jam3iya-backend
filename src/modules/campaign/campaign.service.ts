import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  calendarDateToday,
  isEndDateBeforeToday,
  isStartOnOrBeforeToday,
} from '../../common/utils/calendar-date';
import { BeneficiaryService } from '../beneficiary/beneficiary.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type {
  CreateCampaignDto,
  CreateOccasionDto,
  UpdateCampaignDto,
  UpdateOccasionDto,
  QuickCampaignBeneficiaryDto,
} from './dto';

@Injectable()
export class CampaignService implements OnModuleInit {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiaryService,
    private readonly tenancy: TenancyService,
  ) {}

  onModuleInit(): void {
    void this.syncCampaignStates();
    setInterval(() => void this.syncCampaignStates(), 60 * 60 * 1000);
  }

  /** Keeps campaign state in sync with start/end calendar dates. */
  async syncCampaignStates(organizationId?: string): Promise<void> {
    await this.activateDueCampaigns(organizationId);
    await this.closeExpiredCampaigns(organizationId);
  }

  /** Draft campaigns whose start date has arrived become active. */
  async activateDueCampaigns(organizationId?: string): Promise<number> {
    const endOfToday = calendarDateToday();
    endOfToday.setUTCHours(23, 59, 59, 999);
    const result = await this.prisma.campaign.updateMany({
      where: {
        deletedAt: null,
        state: 'draft',
        ...(organizationId ? { organizationId } : {}),
        startsAt: { lte: endOfToday },
      },
      data: { state: 'active' },
    });
    if (result.count > 0) {
      this.logger.log(`Activated ${result.count} campaign(s) whose start date was reached`);
    }
    return result.count;
  }

  /** Active campaigns whose end date has passed become closed. */
  async closeExpiredCampaigns(organizationId?: string): Promise<number> {
    const startOfToday = calendarDateToday();
    const result = await this.prisma.campaign.updateMany({
      where: {
        deletedAt: null,
        state: 'active',
        endsAt: { not: null, lt: startOfToday },
        ...(organizationId ? { organizationId } : {}),
      },
      data: { state: 'closed' },
    });
    if (result.count > 0) {
      this.logger.log(`Closed ${result.count} campaign(s) whose end date has passed`);
    }
    return result.count;
  }

  private resolveInitialState(
    dto: Pick<CreateCampaignDto, 'startsAt' | 'endsAt' | 'state'>,
  ): 'draft' | 'active' | 'closed' {
    if (dto.state) return dto.state;
    if (dto.endsAt && isEndDateBeforeToday(dto.endsAt)) return 'closed';
    if (isStartOnOrBeforeToday(dto.startsAt)) return 'active';
    return 'draft';
  }

  // ---------- Campaigns ----------
  async listCampaigns(organizationId: string) {
    await this.syncCampaignStates(organizationId);
    const items = await this.prisma.campaign.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ state: 'asc' }, { startsAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        occasionId: true,
        startsAt: true,
        endsAt: true,
        targetAmountMinor: true,
        collectedAmountMinor: true,
        distributedAmountMinor: true,
        currency: true,
        state: true,
        visibleOnPublicPage: true,
        beneficiaryLookupFields: true,
        occasion: { select: { name: true, isHijriBased: true } },
      },
    });
    const ids = items.map((c) => c.id);
    const allocatedByCampaign = new Map<string, number>();
    if (ids.length > 0) {
      const splitRows = await this.prisma.donationBeneficiarySplit.findMany({
        where: {
          donation: { organizationId, campaignId: { in: ids }, deletedAt: null },
        },
        select: {
          amountMinor: true,
          donation: { select: { campaignId: true } },
        },
      });
      for (const row of splitRows) {
        const campaignId = row.donation.campaignId;
        if (!campaignId) continue;
        allocatedByCampaign.set(
          campaignId,
          (allocatedByCampaign.get(campaignId) ?? 0) + Number(row.amountMinor),
        );
      }
    }
    return items.map((c) => {
      const collected = Number(c.collectedAmountMinor);
      const allocated = allocatedByCampaign.get(c.id) ?? 0;
      return {
        ...c,
        targetAmountMinor: c.targetAmountMinor != null ? Number(c.targetAmountMinor) : null,
        collectedAmountMinor: collected,
        distributedAmountMinor: Number(c.distributedAmountMinor),
        allocatedAmountMinor: allocated,
        unassignedAmountMinor: collected - allocated,
      };
    });
  }

  async getCampaign(organizationId: string, id: string) {
    await this.syncCampaignStates(organizationId);
    const c = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { occasion: { select: { name: true, isHijriBased: true } } },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return {
      ...c,
      targetAmountMinor: c.targetAmountMinor != null ? Number(c.targetAmountMinor) : null,
      collectedAmountMinor: Number(c.collectedAmountMinor),
      distributedAmountMinor: Number(c.distributedAmountMinor),
    };
  }

  async createCampaign(organizationId: string, dto: CreateCampaignDto) {
    const exists = await this.prisma.campaign.findFirst({
      where: { organizationId, name: dto.name, deletedAt: null },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Campaign name already exists');

    if (dto.occasionId) {
      const occ = await this.prisma.occasion.findFirst({
        where: { id: dto.occasionId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!occ) throw new NotFoundException('Occasion not found');
    }

    const state = this.resolveInitialState(dto);

    return this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        occasionId: dto.occasionId,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        targetAmountMinor: dto.targetAmountMinor != null ? BigInt(dto.targetAmountMinor) : null,
        currency: (dto.currency ?? 'TND').toUpperCase(),
        visibleOnPublicPage: dto.visibleOnPublicPage ?? true,
        beneficiaryLookupFields: dto.beneficiaryLookupFields ?? ['name', 'phone', 'cin'],
        state,
      },
      select: { id: true },
    });
  }

  async updateCampaign(organizationId: string, id: string, dto: UpdateCampaignDto) {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    if (dto.occasionId) {
      const occ = await this.prisma.occasion.findFirst({
        where: { id: dto.occasionId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!occ) throw new NotFoundException('Occasion not found');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        description: dto.description,
        occasionId: dto.occasionId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt:
          dto.endsAt !== undefined ? (dto.endsAt ? new Date(dto.endsAt) : null) : undefined,
        targetAmountMinor:
          dto.targetAmountMinor === null
            ? null
            : dto.targetAmountMinor != null
              ? BigInt(dto.targetAmountMinor)
              : undefined,
        visibleOnPublicPage: dto.visibleOnPublicPage,
        beneficiaryLookupFields: dto.beneficiaryLookupFields,
        state: dto.state,
      },
      select: { id: true },
    });
  }

  async deleteCampaign(organizationId: string, id: string) {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Campaign not found');
    await this.prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  private async ensureCampaign(organizationId: string, campaignId: string) {
    const c = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async listCampaignBeneficiaries(organizationId: string, campaignId: string) {
    await this.ensureCampaign(organizationId, campaignId);
    const links = await this.prisma.campaignBeneficiary.findMany({
      where: { campaignId, beneficiary: { organizationId, deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        beneficiaryId: true,
        createdAt: true,
        beneficiary: {
          select: {
            id: true,
            code: true,
            publicAlias: true,
            status: true,
            isOrphan: true,
            firstNameEnc: true,
            lastNameEnc: true,
          },
        },
      },
    });

    const splitTotals = await this.prisma.donationBeneficiarySplit.groupBy({
      by: ['beneficiaryId'],
      where: {
        donation: { organizationId, campaignId, deletedAt: null },
      },
      _sum: { amountMinor: true, distributedAmountMinor: true },
    });
    const totalsByBeneficiary = new Map(
      splitTotals.map((g) => [
        g.beneficiaryId,
        {
          allocatedMinor: Number(g._sum.amountMinor ?? 0),
          distributedMinor: Number(g._sum.distributedAmountMinor ?? 0),
        },
      ]),
    );

    return {
      items: links.map((l) => {
        const totals = totalsByBeneficiary.get(l.beneficiaryId) ?? {
          allocatedMinor: 0,
          distributedMinor: 0,
        };
        return {
          linkId: l.id,
          beneficiaryId: l.beneficiaryId,
          createdAt: l.createdAt,
          code: l.beneficiary.code,
          publicAlias: l.beneficiary.publicAlias,
          status: l.beneficiary.status,
          isOrphan: l.beneficiary.isOrphan,
          fullName: this.beneficiaries.formatFullName(
            organizationId,
            l.beneficiary.firstNameEnc,
            l.beneficiary.lastNameEnc,
          ),
          allocatedMinor: totals.allocatedMinor,
          distributedMinor: totals.distributedMinor,
          hasReceivedPayment: totals.distributedMinor > 0,
        };
      }),
    };
  }

  async addCampaignBeneficiary(organizationId: string, campaignId: string, beneficiaryId: string) {
    await this.ensureCampaign(organizationId, campaignId);
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!beneficiary) throw new NotFoundException('Beneficiary not found');

    const existing = await this.prisma.campaignBeneficiary.findUnique({
      where: { campaignId_beneficiaryId: { campaignId, beneficiaryId } },
    });
    if (existing) throw new ConflictException('Beneficiary already linked to this campaign');

    const link = await this.prisma.campaignBeneficiary.create({
      data: { campaignId, beneficiaryId },
      select: { id: true },
    });
    return { id: link.id, beneficiaryId };
  }

  async removeCampaignBeneficiary(
    organizationId: string,
    campaignId: string,
    beneficiaryId: string,
  ) {
    await this.ensureCampaign(organizationId, campaignId);
    const link = await this.prisma.campaignBeneficiary.findFirst({
      where: { campaignId, beneficiaryId, beneficiary: { organizationId } },
      select: { id: true },
    });
    if (!link) throw new NotFoundException('Beneficiary not linked to this campaign');
    await this.prisma.campaignBeneficiary.delete({ where: { id: link.id } });
    return { ok: true };
  }

  async quickAddCampaignBeneficiary(
    organizationId: string,
    campaignId: string,
    dto: QuickCampaignBeneficiaryDto,
  ) {
    await this.ensureCampaign(organizationId, campaignId);
    const mainDept = await this.tenancy.getMainDepartment(organizationId);
    const created = await this.beneficiaries.create(organizationId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      gender: 'male',
      maritalStatus: 'single',
      cin: undefined,
      phone: undefined,
      departmentId: mainDept.id,
      isOrphan: dto.isOrphan ?? false,
      reason: `Added to campaign ${campaignId}`,
    });
    await this.addCampaignBeneficiary(organizationId, campaignId, created.id);
    return { beneficiaryId: created.id, code: created.code };
  }

  private async getCampaignAllocationPool(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { collectedAmountMinor: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const allocatedAgg = await this.prisma.donationBeneficiarySplit.aggregate({
      where: {
        donation: { organizationId, campaignId, deletedAt: null },
      },
      _sum: { amountMinor: true },
    });

    const collectedMinor = Number(campaign.collectedAmountMinor);
    const allocatedMinor = Number(allocatedAgg._sum.amountMinor ?? 0);
    return {
      collectedMinor,
      allocatedMinor,
      unassignedMinor: collectedMinor - allocatedMinor,
    };
  }

  async getBeneficiaryAllocations(organizationId: string, campaignId: string) {
    await this.ensureCampaign(organizationId, campaignId);
    const pool = await this.getCampaignAllocationPool(organizationId, campaignId);

    const splits = await this.prisma.donationBeneficiarySplit.findMany({
      where: {
        donation: { organizationId, campaignId, deletedAt: null },
      },
      orderBy: [{ beneficiaryId: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        donationId: true,
        beneficiaryId: true,
        amountMinor: true,
        distributedAmountMinor: true,
        currency: true,
        paidAt: true,
        createdAt: true,
        donation: { select: { receivedAt: true } },
        beneficiary: {
          select: {
            code: true,
            isOrphan: true,
            firstNameEnc: true,
            lastNameEnc: true,
          },
        },
      },
    });

    const byBeneficiary = new Map<
      string,
      {
        beneficiaryId: string;
        code: string;
        fullName: string;
        isOrphan: boolean;
        allocatedMinor: number;
        distributedMinor: number;
        pendingMinor: number;
        splits: Array<{
          id: string;
          donationId: string;
          amountMinor: number;
          distributedMinor: number;
          pendingMinor: number;
          currency: string;
          paidAt: string | null;
          receivedAt: string;
        }>;
      }
    >();

    for (const s of splits) {
      const amount = Number(s.amountMinor);
      const distributed = Number(s.distributedAmountMinor);
      const pending = Math.max(0, amount - distributed);
      const fullName = this.beneficiaries.formatFullName(
        organizationId,
        s.beneficiary.firstNameEnc,
        s.beneficiary.lastNameEnc,
      );

      const splitRow = {
        id: s.id,
        donationId: s.donationId,
        amountMinor: amount,
        distributedMinor: distributed,
        pendingMinor: pending,
        currency: s.currency,
        paidAt: s.paidAt?.toISOString() ?? null,
        receivedAt: s.donation.receivedAt.toISOString(),
      };

      const existing = byBeneficiary.get(s.beneficiaryId);
      if (existing) {
        existing.allocatedMinor += amount;
        existing.distributedMinor += distributed;
        existing.pendingMinor += pending;
        existing.splits.push(splitRow);
      } else {
        byBeneficiary.set(s.beneficiaryId, {
          beneficiaryId: s.beneficiaryId,
          code: s.beneficiary.code,
          fullName,
          isOrphan: s.beneficiary.isOrphan,
          allocatedMinor: amount,
          distributedMinor: distributed,
          pendingMinor: pending,
          splits: [splitRow],
        });
      }
    }

    return {
      items: [...byBeneficiary.values()],
      collectedMinor: pool.collectedMinor,
      allocatedMinor: pool.allocatedMinor,
      unassignedMinor: pool.unassignedMinor,
    };
  }

  async updateBeneficiarySplit(
    organizationId: string,
    campaignId: string,
    splitId: string,
    amountMinor: number,
  ) {
    await this.ensureCampaign(organizationId, campaignId);
    const split = await this.prisma.donationBeneficiarySplit.findFirst({
      where: {
        id: splitId,
        donation: { organizationId, campaignId, deletedAt: null },
      },
      select: {
        id: true,
        paidAt: true,
        amountMinor: true,
        distributedAmountMinor: true,
      },
    });
    if (!split) throw new NotFoundException('Allocation not found');
    if (split.paidAt) throw new BadRequestException('Cannot edit a paid allocation');

    const currentAmount = Number(split.amountMinor);
    const distributed = Number(split.distributedAmountMinor);
    if (amountMinor <= 0) {
      throw new BadRequestException('Invalid allocation amount');
    }
    if (amountMinor < distributed) {
      throw new BadRequestException('Allocation cannot be less than the amount already distributed');
    }

    const delta = amountMinor - currentAmount;
    const pool = await this.getCampaignAllocationPool(organizationId, campaignId);

    if (delta > 0 && delta > pool.unassignedMinor) {
      const neededMinor = delta - pool.unassignedMinor;
      throw new BadRequestException({
        message: 'INSUFFICIENT_UNASSIGNED',
        neededMinor,
      });
    }

    await this.prisma.donationBeneficiarySplit.update({
      where: { id: splitId },
      data: { amountMinor: BigInt(amountMinor) },
    });

    return { ok: true, unassignedMinor: pool.unassignedMinor - delta };
  }

  async markBeneficiarySplitPaid(organizationId: string, campaignId: string, splitId: string) {
    await this.ensureCampaign(organizationId, campaignId);
    const split = await this.prisma.donationBeneficiarySplit.findFirst({
      where: {
        id: splitId,
        donation: { organizationId, campaignId, deletedAt: null },
      },
      select: {
        id: true,
        amountMinor: true,
        distributedAmountMinor: true,
        paidAt: true,
      },
    });
    if (!split) throw new NotFoundException('Allocation not found');
    if (split.paidAt) throw new BadRequestException('Already marked as paid');

    const toPay = Number(split.amountMinor) - Number(split.distributedAmountMinor);
    if (toPay <= 0) throw new BadRequestException('Nothing left to pay');

    await this.prisma.$transaction(async (tx) => {
      await tx.donationBeneficiarySplit.update({
        where: { id: splitId },
        data: {
          distributedAmountMinor: split.amountMinor,
          paidAt: new Date(),
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { distributedAmountMinor: { increment: BigInt(toPay) } },
      });
    });

    return { ok: true, paidMinor: toPay };
  }

  async unmarkBeneficiarySplitPaid(organizationId: string, campaignId: string, splitId: string) {
    await this.ensureCampaign(organizationId, campaignId);
    const split = await this.prisma.donationBeneficiarySplit.findFirst({
      where: {
        id: splitId,
        donation: { organizationId, campaignId, deletedAt: null },
      },
      select: {
        id: true,
        amountMinor: true,
        distributedAmountMinor: true,
        paidAt: true,
      },
    });
    if (!split) throw new NotFoundException('Allocation not found');
    if (!split.paidAt) throw new BadRequestException('Allocation is not marked as paid');

    const revertMinor = Number(split.distributedAmountMinor);
    if (revertMinor <= 0) throw new BadRequestException('Nothing to revert');

    await this.prisma.$transaction(async (tx) => {
      await tx.donationBeneficiarySplit.update({
        where: { id: splitId },
        data: {
          distributedAmountMinor: BigInt(0),
          paidAt: null,
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { distributedAmountMinor: { decrement: BigInt(revertMinor) } },
      });
    });

    return { ok: true, revertedMinor: revertMinor };
  }

  // ---------- Occasions ----------
  async listOccasions(organizationId: string) {
    return this.prisma.occasion.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { periodStart: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        periodStart: true,
        periodEnd: true,
        recurring: true,
        recurringRule: true,
        isHijriBased: true,
      },
    });
  }

  async createOccasion(organizationId: string, dto: CreateOccasionDto) {
    return this.prisma.occasion.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        periodStart: new Date(dto.periodStart),
        periodEnd: dto.periodEnd != null ? new Date(dto.periodEnd) : null,
        recurring: dto.recurring ?? false,
        recurringRule: dto.recurringRule,
        isHijriBased: dto.isHijriBased ?? false,
      },
      select: { id: true },
    });
  }

  async updateOccasion(organizationId: string, id: string, dto: UpdateOccasionDto) {
    const existing = await this.prisma.occasion.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Occasion not found');
    return this.prisma.occasion.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd:
          dto.periodEnd !== undefined
            ? dto.periodEnd != null
              ? new Date(dto.periodEnd)
              : null
            : undefined,
        recurring: dto.recurring,
        recurringRule: dto.recurringRule,
        isHijriBased: dto.isHijriBased,
      },
      select: { id: true },
    });
  }

  async deleteOccasion(organizationId: string, id: string) {
    const existing = await this.prisma.occasion.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Occasion not found');
    await this.prisma.occasion.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
