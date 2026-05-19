import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type AuditOutcome = 'allow' | 'deny' | 'error';

export interface AuditEvent {
  organizationId?: string | null;
  actorUserId?: string | null;
  actorIp?: string | null;
  actorUserAgent?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome?: AuditOutcome;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an audit row. Failures are logged but never thrown — auditing
   * must not break the user action.
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: event.organizationId ?? null,
          actorUserId: event.actorUserId ?? null,
          actorIp: event.actorIp ?? null,
          actorUserAgent: event.actorUserAgent ?? null,
          action: event.action,
          resourceType: event.resourceType ?? null,
          resourceId: event.resourceId ?? null,
          outcome: (event.outcome ?? 'allow') as 'allow' | 'deny' | 'error',
          reason: event.reason ?? null,
          before: event.before === undefined ? Prisma.JsonNull : (event.before as Prisma.InputJsonValue),
          after: event.after === undefined ? Prisma.JsonNull : (event.after as Prisma.InputJsonValue),
          metadata: event.metadata === undefined || event.metadata === null
            ? Prisma.JsonNull
            : (event.metadata as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      this.logger.warn(`Audit write failed for ${event.action}: ${(err as Error).message}`);
    }
  }
}
