import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthorizedRequest, AuthenticatedUser } from '../types/request-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthorizedRequest>();
    return req.user;
  },
);

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthorizedRequest>();
    return req.user?.organizationId;
  },
);
