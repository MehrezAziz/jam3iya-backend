import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { calendarDateToday, isStartOnOrBeforeToday } from '../../common/utils/calendar-date';
import type {
  CreateCampaignDto,
  CreateOccasionDto,
  UpdateCampaignDto,
  UpdateOccasionDto,
} from './dto';

@Injectable()
export class CampaignService implements OnModuleInit {
  private readonly logger = new Logger(CampaignService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.activateDueCampaigns();
    setInterval(() => void this.activateDueCampaigns(), 60 * 60 * 1000);
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

  // ---------- Campaigns ----------
  async listCampaigns(organizationId: string) {
    await this.activateDueCampaigns(organizationId);
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
        occasion: { select: { name: true, isHijriBased: true } },
      },
    });
    return items.map((c) => ({
      ...c,
      targetAmountMinor: c.targetAmountMinor != null ? Number(c.targetAmountMinor) : null,
      collectedAmountMinor: Number(c.collectedAmountMinor),
      distributedAmountMinor: Number(c.distributedAmountMinor),
    }));
  }

  async getCampaign(organizationId: string, id: string) {
    await this.activateDueCampaigns(organizationId);
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

    const state = dto.state ?? (isStartOnOrBeforeToday(dto.startsAt) ? 'active' : 'draft');

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
        periodEnd: new Date(dto.periodEnd),
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
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
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
