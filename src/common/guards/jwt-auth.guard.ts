import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import type { AuthorizedRequest, AuthenticatedUser } from '../types/request-context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthorizedRequest>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      const user: AuthenticatedUser = {
        userId: payload.sub,
        organizationId: payload.org,
        kind: payload.knd,
        email: payload.eml,
        fullName: payload.nm,
        sessionId: payload.sid,
        twoFactorVerifiedAt: payload.t2v,
        departmentId: payload.dept,
      };
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(req: AuthorizedRequest): string | null {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.['access_token'];
    if (cookieToken) return cookieToken;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}

export interface AccessTokenPayload {
  sub: string;
  org: string;
  knd: 'staff' | 'donor' | 'department';
  eml: string;
  nm: string;
  sid: string;
  t2v?: number;
  dept?: string;
}
