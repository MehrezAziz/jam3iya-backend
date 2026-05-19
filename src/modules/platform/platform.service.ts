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

  async getOrganization(id: string): Promise<OrganizationSummary> {
    const o = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: { where: { deletedAt: null } }, departments: { where: { deletedAt: null } } } },
      },
    });
    if (!o || o.deletedAt) throw new NotFoundException('Organization not found');
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
      createdAt: o.createdAt,
      userCount: o._count.users,
      departmentCount: o._count.departments,
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
