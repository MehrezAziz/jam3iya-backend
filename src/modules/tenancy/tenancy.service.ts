import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  getOrganization(organizationId: string) {
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        legalName: true,
        slug: true,
        fiscalId: true,
        country: true,
        defaultCurrency: true,
        defaultLanguage: true,
        timezone: true,
        status: true,
        settings: true,
        publicPageEnabled: true,
        publicPageConfig: true,
        defaultBillSeries: true,
      },
    });
  }

  async getOrganizationBySlug(slug: string) {
    if (slug.startsWith('__')) {
      throw new NotFoundException('Organization not found');
    }
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        legalName: true,
        slug: true,
        defaultCurrency: true,
        defaultLanguage: true,
        publicPageEnabled: true,
        status: true,
      },
    });
    if (!org || org.status !== 'active' || !org.publicPageEnabled) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  listDepartments(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(organizationId: string, data: { name: string; description?: string; isMain?: boolean }) {
    return this.prisma.department.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        isMain: data.isMain ?? false,
      },
    });
  }

  /**
   * Aggregated, privacy-safe statistics for the public transparency page.
   * Only counts and totals — no personally identifiable information.
   */
  async getPublicStats(organizationId: string) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [donations, distributions, beneficiaries, campaigns] = await Promise.all([
      this.prisma.donation.aggregate({
        where: { organizationId, deletedAt: null, kind: { not: 'in_kind' }, receivedAt: { gte: startOfYear } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.distribution.count({
        where: {
          organizationId,
          deletedAt: null,
          status: 'delivered',
          deliveredAt: { gte: startOfYear },
        },
      }),
      this.prisma.beneficiary.count({
        where: { organizationId, deletedAt: null, status: 'active' },
      }),
      this.prisma.campaign.findMany({
        where: {
          organizationId,
          deletedAt: null,
          visibleOnPublicPage: true,
          state: { in: ['active', 'closed'] },
        },
        orderBy: [{ state: 'asc' }, { startsAt: 'desc' }],
        take: 12,
        select: {
          id: true,
          name: true,
          description: true,
          startsAt: true,
          endsAt: true,
          targetAmountMinor: true,
          collectedAmountMinor: true,
          distributedAmountMinor: true,
          currency: true,
          state: true,
        },
      }),
    ]);

    return {
      year: now.getFullYear(),
      totals: {
        donationsCount: donations._count,
        donationsAmountMinor: Number(donations._sum.amountMinor ?? 0n),
        distributionsCount: distributions,
        activeBeneficiaries: beneficiaries,
      },
      campaigns: campaigns.map((c) => ({
        ...c,
        targetAmountMinor: c.targetAmountMinor != null ? Number(c.targetAmountMinor) : null,
        collectedAmountMinor: Number(c.collectedAmountMinor),
        distributedAmountMinor: Number(c.distributedAmountMinor),
      })),
    };
  }
}
