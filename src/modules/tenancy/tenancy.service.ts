import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
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

  async createDepartment(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      isMain?: boolean;
      loginCode?: string;
      password?: string;
    },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const loginCode = data.loginCode?.trim().toLowerCase() || null;
    if (loginCode) {
      const taken = await this.prisma.department.findFirst({
        where: { organizationId, loginCode, deletedAt: null },
      });
      if (taken) throw new ConflictException('Department login code already in use');
    }

    const passwordHash =
      data.password && data.password.length >= 8
        ? await argon2.hash(data.password, { type: argon2.argon2id })
        : null;

    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description,
          isMain: data.isMain ?? false,
          loginCode,
          passwordHash,
        },
      });

      if (loginCode && passwordHash) {
        const email = `${loginCode}@${org.slug}.dept.local`;
        const existing = await tx.user.findUnique({
          where: { organizationId_email: { organizationId, email } },
        });
        if (existing) throw new ConflictException('Department login email already exists');

        const deptRole = await tx.role.findFirst({
          where: { name: 'employee', isSystem: true, organizationId: null, deletedAt: null },
          select: { id: true },
        });
        if (!deptRole) throw new NotFoundException('employee role not found — run db:seed');

        const user = await tx.user.create({
          data: {
            organizationId,
            kind: 'staff',
            email,
            fullName: `Department: ${data.name}`,
            passwordHash,
            status: 'active',
            lastPasswordChangeAt: new Date(),
          },
        });
        await tx.userDepartmentRole.create({
          data: {
            userId: user.id,
            departmentId: dept.id,
            roleId: deptRole.id,
          },
        });
      }

      return { ...dept, passwordHash: undefined };
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
