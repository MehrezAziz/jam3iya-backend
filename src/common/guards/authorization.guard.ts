import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_PERM_KEY,
  RequirePermOptions,
} from '../decorators/require-perm.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthorizationService } from '../../modules/authz/authorization.service';
import { BeneficiaryAccessService } from '../../modules/tenancy/beneficiary-access.service';
import type { AuthorizedRequest } from '../types/request-context';

const TWO_FA_RECENT_WINDOW_SEC = 300;

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authz: AuthorizationService,
    private readonly beneficiaryAccess: BeneficiaryAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RequirePermOptions>(REQUIRE_PERM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<AuthorizedRequest>();
    if (!req.user) throw new UnauthorizedException('Authentication required');

    const userCtx = await this.authz.loadUserContext(req.user);
    req.permissions = userCtx.permissions;
    req.departmentIds = userCtx.departmentIds;
    req.roleIds = userCtx.roleIds;

    this.authz.ensurePermissions(userCtx, required.permissions, required.mode ?? 'all');

    if (required.requiresReason) {
      const reason =
        (req.query?.reason as string | undefined) ??
        (req.body?.reason as string | undefined) ??
        (req.headers['x-reason'] as string | undefined);
      if (!reason || reason.trim().length < 5) {
        throw new ForbiddenException({
          message: 'A reason (>=5 chars) is required for this action.',
          code: 'REASON_REQUIRED',
        });
      }
      req.reason = reason.trim();
    }

    if (required.requiresBeneficiaryAccess) {
      await this.beneficiaryAccess.assertAccess(req.user.organizationId, req.user.userId);
    }

    if (required.requires2faRecent) {
      const ts = req.user.twoFactorVerifiedAt ?? 0;
      const now = Math.floor(Date.now() / 1000);
      if (now - ts > TWO_FA_RECENT_WINDOW_SEC) {
        throw new ForbiddenException({
          message: 'Recent 2FA challenge required.',
          code: 'TWO_FACTOR_REQUIRED',
        });
      }
    }

    return true;
  }
}
