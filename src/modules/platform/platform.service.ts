import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type {
  CreateOrganizationDto,
  SuspendOrganizationDto,
  UpdateOrganizationDto,
  UpdateOrgAdminDto,
} from './dto';

const PLATFORM_SLUG = '__platform__';
const ORG_ADMIN_ROLE = 'org_admin';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listOrganizations(actorUserId: string, includePlatform = false): Promise<OrganizationSummary[]> {
    const orgs = await this.prisma.organization.findMany({
      where: includePlatform
        ? { deletedAt: null }
        : { deletedAt: null, slug: { not: PLATFORM_SLUG } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } }, departments: { where: { deletedAt: null } } },
        },
      },
    });
    await this.audit.log({
      organizationId: null,
      actorUserId,
      action: 'platform.org.list',
      outcome: 'allow',
    });
    return orgs.map((o) => ({
      id: o.id,
      legalName: o.legalName,
      slug: o.slug,
      country: o.country,
      defaultCurrency: o.defaultCurrency,
      defaultLanguage: o.defaultLanguage,
      timezone: o.timezone,
      status: o.status,
      publicPageEnabled: o.publicPageEnabled,
      fiscalId: o.fiscalId,
      createdAt: o.createdAt,
      userCount: o._count.users,
      departmentCount: o._count.departments,
    }));
  }

  async getOrganization(id: string): Promise<OrganizationDetail> {
    const o = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: { where: { deletedAt: null } }, departments: { where: { deletedAt: null } } } },
        departments: {
          where: { isMain: true, deletedAt: null },
          take: 1,
          select: { name: true, region: true, city: true },
        },
      },
    });
    if (!o || o.deletedAt) throw new NotFoundException('Organization not found');

    const admins = await this.prisma.user.findMany({
      where: {
        organizationId: id,
        deletedAt: null,
        kind: 'staff',
        departmentRoles: {
          some: {
            deletedAt: null,
            role: { name: ORG_ADMIN_ROLE, isSystem: true, deletedAt: null },
          },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        locale: true,
        status: true,
        mustChangePassword: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const mainDept = o.departments[0] ?? null;
    return {
      id: o.id,
      legalName: o.legalName,
      slug: o.slug,
      country: o.country,
      defaultCurrency: o.defaultCurrency,
      defaultLanguage: o.defaultLanguage,
      timezone: o.timezone,
      status: o.status,
      publicPageEnabled: o.publicPageEnabled,
      fiscalId: o.fiscalId,
      email: o.email,
      address: o.address,
      phone: o.phone,
      website: o.website,
      createdAt: o.createdAt,
      userCount: o._count.users,
      departmentCount: o._count.departments,
      mainDepartment: mainDept
        ? { name: mainDept.name, region: mainDept.region, city: mainDept.city }
        : null,
      admins: admins.map((a) => ({
        id: a.id,
        email: a.email,
        fullName: a.fullName,
        phone: a.phone,
        locale: a.locale as 'ar' | 'fr' | 'en',
        status: a.status,
        mustChangePassword: a.mustChangePassword,
        lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
      })),
    };
  }

  async updateOrgAdmin(
    actorUserId: string,
    organizationId: string,
    userId: string,
    dto: UpdateOrgAdminDto,
  ): Promise<{
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    status: string;
    mustChangePassword: boolean;
    lastLoginAt: string | null;
    oneTimePassword: string | null;
  }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    if (org.slug === PLATFORM_SLUG) {
      throw new BadRequestException('Cannot update platform organization users here');
    }

    const admin = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
        kind: 'staff',
        departmentRoles: {
          some: {
            deletedAt: null,
            role: { name: ORG_ADMIN_ROLE, isSystem: true, deletedAt: null },
          },
        },
      },
    });
    if (!admin) throw new NotFoundException('Organization admin user not found');

    let oneTimePassword: string | null = null;
    let passwordHash: string | undefined;
    let mustChangePassword: boolean | undefined;

    if (dto.newPassword) {
      passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
      mustChangePassword = false;
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
            ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
            ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
            ...(passwordHash
              ? {
                  passwordHash,
                  mustChangePassword: false,
                  lastPasswordChangeAt: new Date(),
                  failedLoginCount: 0,
                  lockedUntil: null,
                }
              : {}),
          },
        });
        if (passwordHash) {
          await tx.userSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date(), revokedReason: 'credentials_updated_by_platform' },
          });
        }
        return user;
      });

      await this.audit.log({
        organizationId: null,
        actorUserId,
        action: 'platform.org.admin.update',
        resourceType: 'user',
        resourceId: userId,
        outcome: 'allow',
        before: {
          email: admin.email,
          fullName: admin.fullName,
          phone: admin.phone,
        },
        after: {
          email: updated.email,
          fullName: updated.fullName,
          phone: updated.phone,
          passwordChanged: !!dto.newPassword,
        },
      });

      return {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        status: updated.status,
        mustChangePassword: updated.mustChangePassword,
        lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
        oneTimePassword,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Admin email already in use in this organization');
      }
      throw err;
    }
  }

  async resetOrgAdminPassword(
    actorUserId: string,
    organizationId: string,
    userId: string,
    dto: { newPassword?: string },
  ): Promise<{ userId: string; email: string; oneTimePassword: string | null; mustChangePassword: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    if (org.slug === PLATFORM_SLUG) {
      throw new BadRequestException('Cannot reset password for platform organization users here');
    }

    const admin = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
        kind: 'staff',
        departmentRoles: {
          some: {
            deletedAt: null,
            role: { name: ORG_ADMIN_ROLE, isSystem: true, deletedAt: null },
          },
        },
      },
    });
    if (!admin) throw new NotFoundException('Organization admin user not found');

    const generated = dto.newPassword ? null : this.generateOneTimePassword();
    const plain = dto.newPassword ?? (generated as string);
    const passwordHash = await argon2.hash(plain, { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: !dto.newPassword,
          lastPasswordChangeAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_reset_by_platform' },
      });
    });

    await this.audit.log({
      organizationId: null,
      actorUserId,
      action: 'platform.org.admin.reset_password',
      resourceType: 'user',
      resourceId: userId,
      outcome: 'allow',
      after: { organizationId, adminEmail: admin.email, generated: !dto.newPassword },
    });

    return {
      userId: admin.id,
      email: admin.email,
      oneTimePassword: generated,
      mustChangePassword: !dto.newPassword,
    };
  }

  async createOrganization(
    actorUserId: string,
    dto: CreateOrganizationDto,
  ): Promise<CreateOrganizationResult> {
    if (dto.slug === PLATFORM_SLUG || dto.slug.startsWith('__')) {
      throw new BadRequestException('Reserved slug');
    }

    // Make sure the org_admin system role exists.
    const orgAdminRole = await this.prisma.role.findFirst({
      where: { name: ORG_ADMIN_ROLE, isSystem: true, organizationId: null, deletedAt: null },
    });
    if (!orgAdminRole) {
      throw new BadRequestException('System role org_admin missing — run db:seed first');
    }

    // Generate an initial password if the caller didn't supply one.
    const generatedPassword = dto.admin.initialPassword
      ? null
      : this.generateOneTimePassword();
    const initialPassword = dto.admin.initialPassword ?? (generatedPassword as string);
    const passwordHash = await argon2.hash(initialPassword, { type: argon2.argon2id });

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            legalName: dto.legalName,
            slug: dto.slug,
            country: dto.country,
            defaultCurrency: dto.defaultCurrency,
            defaultLanguage: dto.defaultLanguage,
            timezone: dto.timezone,
            fiscalId: dto.fiscalId ?? null,
            publicPageEnabled: dto.publicPageEnabled,
            status: 'active',
          },
        });
        const dept = await tx.department.create({
          data: {
            organizationId: org.id,
            name: dto.mainDepartmentName,
            description: 'Main department',
            isMain: true,
            region: dto.mainDepartmentRegion?.trim() || null,
            city: dto.mainDepartmentCity?.trim() || null,
          },
        });
        const admin = await tx.user.create({
          data: {
            organizationId: org.id,
            kind: 'staff',
            email: dto.admin.email,
            fullName: dto.admin.fullName,
            phone: dto.admin.phone ?? null,
            passwordHash,
            status: 'active',
            locale: dto.admin.locale,
            // mustChangePassword is enforced for generated passwords
            mustChangePassword: !dto.admin.initialPassword,
            lastPasswordChangeAt: new Date(),
          },
        });
        await tx.userDepartmentRole.create({
          data: {
            userId: admin.id,
            departmentId: dept.id,
            roleId: orgAdminRole.id,
          },
        });
        return { org, dept, admin };
      });

      await this.audit.log({
        organizationId: null,
        actorUserId,
        action: 'platform.org.create',
        resourceType: 'organization',
        resourceId: result.org.id,
        outcome: 'allow',
        after: {
          id: result.org.id,
          slug: result.org.slug,
          legalName: result.org.legalName,
          adminUserId: result.admin.id,
          adminEmail: result.admin.email,
        },
      });

      return {
        organization: {
          id: result.org.id,
          legalName: result.org.legalName,
          slug: result.org.slug,
          country: result.org.country,
          defaultCurrency: result.org.defaultCurrency,
          defaultLanguage: result.org.defaultLanguage,
          timezone: result.org.timezone,
          status: result.org.status,
          publicPageEnabled: result.org.publicPageEnabled,
          fiscalId: result.org.fiscalId,
          createdAt: result.org.createdAt,
          userCount: 1,
          departmentCount: 1,
        },
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          fullName: result.admin.fullName,
          // Returned exactly once. Caller should hand it to the new admin
          // through a secure channel (printout, SMS, sealed envelope).
          oneTimePassword: generatedPassword,
          mustChangePassword: !dto.admin.initialPassword,
        },
        loginUrl: `/login?slug=${encodeURIComponent(result.org.slug)}`,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Slug or admin email already in use');
      }
      throw err;
    }
  }

  async updateOrganization(
    actorUserId: string,
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationSummary> {
    const before = await this.prisma.organization.findUnique({ where: { id } });
    if (!before || before.deletedAt) throw new NotFoundException('Organization not found');
    if (before.slug === PLATFORM_SLUG) {
      throw new BadRequestException('Cannot edit the platform organization through this endpoint');
    }
    const updated = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: {
        _count: { select: { users: { where: { deletedAt: null } }, departments: { where: { deletedAt: null } } } },
      },
    });
    await this.audit.log({
      organizationId: null,
      actorUserId,
      action: 'platform.org.update',
      resourceType: 'organization',
      resourceId: id,
      outcome: 'allow',
      before: {
        legalName: before.legalName,
        defaultCurrency: before.defaultCurrency,
        defaultLanguage: before.defaultLanguage,
        publicPageEnabled: before.publicPageEnabled,
      },
      after: dto,
    });
    return {
      id: updated.id,
      legalName: updated.legalName,
      slug: updated.slug,
      country: updated.country,
      defaultCurrency: updated.defaultCurrency,
      defaultLanguage: updated.defaultLanguage,
      timezone: updated.timezone,
      status: updated.status,
      publicPageEnabled: updated.publicPageEnabled,
      fiscalId: updated.fiscalId,
      createdAt: updated.createdAt,
      userCount: updated._count.users,
      departmentCount: updated._count.departments,
    };
  }

  async setSuspended(
    actorUserId: string,
    id: string,
    dto: SuspendOrganizationDto,
  ): Promise<OrganizationSummary> {
    const before = await this.prisma.organization.findUnique({ where: { id } });
    if (!before || before.deletedAt) throw new NotFoundException('Organization not found');
    if (before.slug === PLATFORM_SLUG) {
      throw new BadRequestException('Cannot suspend the platform organization');
    }
    const newStatus = dto.suspended ? 'suspended' : 'active';
    const updated = await this.prisma.organization.update({
      where: { id },
      data: { status: newStatus },
      include: {
        _count: { select: { users: { where: { deletedAt: null } }, departments: { where: { deletedAt: null } } } },
      },
    });
    if (dto.suspended) {
      // Revoke every active session for users of that org.
      await this.prisma.userSession.updateMany({
        where: { user: { organizationId: id }, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'org_suspended' },
      });
    }
    await this.audit.log({
      organizationId: null,
      actorUserId,
      action: dto.suspended ? 'platform.org.suspend' : 'platform.org.reactivate',
      resourceType: 'organization',
      resourceId: id,
      outcome: 'allow',
      reason: dto.reason ?? null,
      before: { status: before.status },
      after: { status: newStatus },
    });
    return {
      id: updated.id,
      legalName: updated.legalName,
      slug: updated.slug,
      country: updated.country,
      defaultCurrency: updated.defaultCurrency,
      defaultLanguage: updated.defaultLanguage,
      timezone: updated.timezone,
      status: updated.status,
      publicPageEnabled: updated.publicPageEnabled,
      fiscalId: updated.fiscalId,
      createdAt: updated.createdAt,
      userCount: updated._count.users,
      departmentCount: updated._count.departments,
    };
  }

  private generateOneTimePassword(): string {
    // 16-char URL-safe base64; ~96 bits of entropy
    return randomBytes(12).toString('base64url') + '!A1';
  }
}

export interface OrganizationSummary {
  id: string;
  legalName: string;
  slug: string;
  country: string;
  defaultCurrency: string;
  defaultLanguage: string;
  timezone: string;
  status: string;
  publicPageEnabled: boolean;
  fiscalId: string | null;
  createdAt: Date;
  userCount: number;
  departmentCount: number;
}

export interface OrganizationDetail extends OrganizationSummary {
  email: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  mainDepartment: { name: string; region: string | null; city: string | null } | null;
  admins: Array<{
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    locale: 'ar' | 'fr' | 'en';
    status: string;
    mustChangePassword: boolean;
    lastLoginAt: string | null;
  }>;
}

export interface CreateOrganizationResult {
  organization: OrganizationSummary;
  admin: {
    id: string;
    email: string;
    fullName: string;
    oneTimePassword: string | null;
    mustChangePassword: boolean;
  };
  loginUrl: string;
}
