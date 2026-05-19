import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';
import { AuditService } from '../../modules/audit/audit.service';
import type { AuthorizedRequest } from '../types/request-context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.getAllAndOverride<AuditOptions>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!opts) return next.handle();

    const req = context.switchToHttp().getRequest<AuthorizedRequest>();
    const startTime = Date.now();
    const resourceId =
      opts.resourceIdParam && req.params ? (req.params[opts.resourceIdParam] as string) : undefined;

    return next.handle().pipe(
      tap((result) => {
        this.auditService
          .log({
            organizationId: req.user?.organizationId ?? null,
            actorUserId: req.user?.userId ?? null,
            actorIp: (req.ip ?? null) as string | null,
            actorUserAgent: req.headers['user-agent'] ?? null,
            action: opts.action,
            resourceType: opts.resourceType ?? null,
            resourceId: resourceId ?? null,
            outcome: 'allow',
            reason: opts.includeReason && req.reason ? req.reason : null,
            metadata: { durationMs: Date.now() - startTime },
            after: opts.captureDiff ? (result as unknown) : undefined,
          })
          .catch((auditErr) =>
            this.logger.warn(`audit write failed: ${(auditErr as Error).message}`),
          );
      }),
      catchError((err) => {
        this.auditService
          .log({
            organizationId: req.user?.organizationId ?? null,
            actorUserId: req.user?.userId ?? null,
            actorIp: (req.ip ?? null) as string | null,
            actorUserAgent: req.headers['user-agent'] ?? null,
            action: opts.action,
            resourceType: opts.resourceType ?? null,
            resourceId: resourceId ?? null,
            outcome: err?.status >= 400 && err?.status < 500 ? 'deny' : 'error',
            reason: opts.includeReason && req.reason ? req.reason : null,
            metadata: { durationMs: Date.now() - startTime, error: (err as Error).message },
          })
          .catch((auditErr) =>
            this.logger.warn(`audit write failed: ${(auditErr as Error).message}`),
          );
        return throwError(() => err);
      }),
    );
  }
}
