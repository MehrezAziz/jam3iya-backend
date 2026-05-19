import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/request-context';

export interface AuthorizationContext {
  user: AuthenticatedUser;
  organizationId: string;
  /** Department to which the action is targeted (if known). */
  targetDepartmentId?: string;
  reasonProvided?: boolean;
  twoFactorRecent?: boolean;
}

/**
 * Centralized authorization service. Loads role/permission/department
 * assignments for a user inside an org and evaluates RBAC + ABAC checks.
 *
 * In v0 the lookup goes straight to Prisma; a small Redis cache will be
 * added in v1 hardening.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async loadUserContext(user: AuthenticatedUser): Promise<UserAuthorizationContext> {
    const assignments = await this.prisma.userDepartmentRole.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
        OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
        role: { deletedAt: null },
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const permissions = new Set<string>();
    const departmentIds = new Set<string>();
    const roleIds = new Set<string>();
    let maxPrivilege = 0;
    for (const a of assignments) {
      departmentIds.add(a.departmentId);
      roleIds.add(a.roleId);
      maxPrivilege = Math.max(maxPrivilege, a.role.privilegeLevel);
      for (const rp of a.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    return {
      permissions,
      departmentIds: Array.from(departmentIds),
      roleIds: Array.from(roleIds),
      maxPrivilegeLevel: maxPrivilege,
    };
  }

  hasPermission(ctx: UserAuthorizationContext, code: string): boolean {
    return ctx.permissions.has(code);
  }

  /**
   * Throws ForbiddenException if the user does not satisfy all required
   * permissions (mode='all' default) or any one of them (mode='any').
   */
  ensurePermissions(
    ctx: UserAuthorizationContext,
    required: string | string[],
    mode: 'all' | 'any' = 'all',
  ): void {
    const list = Array.isArray(required) ? required : [required];
    const ok =
      mode === 'all'
        ? list.every((p) => ctx.permissions.has(p))
        : list.some((p) => ctx.permissions.has(p));
    if (!ok) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        required: list,
        mode,
      });
    }
  }

  ensureSameDepartmentOrElevated(
    ctx: UserAuthorizationContext,
    targetDepartmentId?: string,
    elevatedPerm = 'org.read',
  ): void {
    if (!targetDepartmentId) return;
    if (ctx.permissions.has(elevatedPerm) && ctx.maxPrivilegeLevel >= 80) return;
    if (!ctx.departmentIds.includes(targetDepartmentId)) {
      throw new ForbiddenException('Department scope mismatch');
    }
  }

  ensureFreshTwoFactor(authCtx: AuthorizationContext): void {
    if (!authCtx.twoFactorRecent) {
      throw new ForbiddenException({
        message: 'This action requires recent two-factor authentication.',
        code: 'TWO_FACTOR_REQUIRED',
      });
    }
  }

  ensureReason(authCtx: AuthorizationContext): void {
    if (!authCtx.reasonProvided) {
      throw new ForbiddenException({
        message: 'A typed reason is required for this action.',
        code: 'REASON_REQUIRED',
      });
    }
  }
}

export interface UserAuthorizationContext {
  permissions: Set<string>;
  departmentIds: string[];
  roleIds: string[];
  maxPrivilegeLevel: number;
}
