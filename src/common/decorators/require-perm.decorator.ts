import { SetMetadata } from '@nestjs/common';

export interface RequirePermOptions {
  /** A permission code (e.g. "beneficiary.read.full") or list of them. */
  permissions: string | string[];
  /** Caller must have ALL listed permissions (default) or ANY of them. */
  mode?: 'all' | 'any';
  /** Caller must provide a typed reason (query/body) for sensitive actions. */
  requiresReason?: boolean;
  /** Caller must have a 2FA challenge within the last 5 minutes. */
  requires2faRecent?: boolean;
}

export const REQUIRE_PERM_KEY = 'requirePerm';

export const RequirePerm = (opts: RequirePermOptions | string | string[]) => {
  const normalized: RequirePermOptions =
    typeof opts === 'string' || Array.isArray(opts) ? { permissions: opts } : opts;
  return SetMetadata(REQUIRE_PERM_KEY, normalized);
};
