import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps the generated client and provides a helper to run any
 * piece of work with a per-request tenant context. The helper opens a
 * transaction and applies SET LOCAL app.current_org / app.current_user so
 * that Postgres Row-Level Security policies filter every query.
 *
 * In v0 there is no real DB / no RLS policies applied yet, so the helper
 * still functions as a regular Prisma transaction.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      this.logger.warn(
        `Database connection failed (continuing — start Postgres for full functionality): ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Run a callback inside a Postgres transaction with the tenant context set
   * via SET LOCAL. Any query made through `tx` will be filtered by RLS once
   * policies are applied.
   */
  async runWithTenantContext<T>(
    organizationId: string | null,
    userId: string | null,
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      if (organizationId) {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_org', '${this.escapeIdentifier(organizationId)}', true)`,
        );
      }
      if (userId) {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_user', '${this.escapeIdentifier(userId)}', true)`,
        );
      }
      return callback(tx);
    });
  }

  private escapeIdentifier(value: string): string {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value)) {
      throw new Error('Invalid identifier for SET LOCAL context');
    }
    return value;
  }
}
