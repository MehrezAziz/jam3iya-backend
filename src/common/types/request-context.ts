import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  kind: 'staff' | 'donor' | 'department';
  departmentId?: string;
  email: string;
  fullName: string;
  twoFactorVerifiedAt?: number;
  sessionId: string;
}

export interface AuthorizedRequest extends Request {
  user?: AuthenticatedUser;
  reason?: string;
  permissions?: Set<string>;
  departmentIds?: string[];
  roleIds?: string[];
  requestId?: string;
}
