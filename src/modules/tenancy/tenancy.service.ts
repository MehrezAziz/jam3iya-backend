import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async listDepartments(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    const depts = await this.prisma.department.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isMain: true,
        region: true,
        city: true,
        loginCode: true,
      },
    });
    const slug = org?.slug ?? '';
    const deptIds = depts.map((d) => d.id);
    const loginByDept = new Map<string, string>();
    if (deptIds.length > 0) {
      const assignments = await this.prisma.userDepartmentRole.findMany({
        where: {
          departmentId: { in: deptIds },
          deletedAt: null,
          role: { name: 'employee', isSystem: true },
        },
        select: {
          departmentId: true,
          user: { select: { email: true } },
        },
      });
      for (const a of assignments) {
        if (!loginByDept.has(a.departmentId)) {
          loginByDept.set(a.departmentId, a.user.email);
        }
      }
    }
    return depts.map((d) => ({
      ...d,
      loginEmail:
        loginByDept.get(d.id) ??
        (d.loginCode && slug ? `${d.loginCode}@${slug}.dept.local` : null),
    }));
  }

  async getMainDepartment(organizationId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { organizationId, isMain: true, deletedAt: null },
      select: { id: true, name: true, region: true, city: true, isMain: true },
    });
    if (!dept) throw new NotFoundException('Main department not found');
    return dept;
  }

  async updateMainDepartmentLocation(
    organizationId: string,
    data: { region?: string | null; city?: string | null },
  ) {
    const dept = await this.getMainDepartment(organizationId);
    return this.prisma.department.update({
      where: { id: dept.id },
      data: {
        region: data.region !== undefined ? data.region?.trim() || null : undefined,
        city: data.city !== undefined ? data.city?.trim() || null : undefined,
      },
      select: { id: true, name: true, region: true, city: true, isMain: true },
    });
  }

  async createDepartment(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      isMain?: boolean;
      loginEmail?: string;
      password?: string;
    },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const loginEmail = data.loginEmail?.trim().toLowerCase() || null;

    if (data.password && data.password.length < 12) {
      throw new BadRequestException('Department password must be at least 12 characters');
    }

    const passwordHash =
      data.password && data.password.length >= 12
        ? await argon2.hash(data.password, { type: argon2.argon2id })
        : null;

    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          organizationId,
          name: data.name,
          description: data.description,
          isMain: data.isMain ?? false,
          loginCode: null,
          passwordHash,
        },
      });

      if (loginEmail && passwordHash) {
        const existing = await tx.user.findUnique({
          where: { organizationId_email: { organizationId, email: loginEmail } },
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
            email: loginEmail,
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
