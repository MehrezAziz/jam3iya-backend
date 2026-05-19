import { SetMetadata } from '@nestjs/common';

export interface AuditOptions {
  action: string;
  resourceType?: string;
  /** Read the resourceId from a request param of this name. */
  resourceIdParam?: string;
  /** Capture before/after diff for write actions. */
  captureDiff?: boolean;
  /** Include the user-provided "reason" string in the audit record. */
  includeReason?: boolean;
}

export const AUDIT_KEY = 'audit';
export const AuditAction = (opts: AuditOptions) => SetMetadata(AUDIT_KEY, opts);
