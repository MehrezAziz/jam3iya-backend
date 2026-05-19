import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';

const PIN_HASH_KEY = 'beneficiaryAccessPinHash';
const GRANT_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BeneficiaryAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private settingsRecord(settings: unknown): Record<string, unknown> {
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      return settings as Record<string, unknown>;
    }
    return {};
  }

  async isPinConfigured(organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const hash = this.settingsRecord(org?.settings)[PIN_HASH_KEY];
    return typeof hash === 'string' && hash.length > 0;
  }

  async hasActiveGrant(organizationId: string, userId: string): Promise<boolean> {
    const grant = await this.prisma.beneficiaryAccessGrant.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    return !!grant && grant.expiresAt > new Date();
  }

  async assertAccess(organizationId: string, userId: string): Promise<void> {
    const configured = await this.isPinConfigured(organizationId);
    if (!configured) return;
    const ok = await this.hasActiveGrant(organizationId, userId);
    if (!ok) {
      throw new ForbiddenException({
        message: 'Beneficiary file PIN required.',
        code: 'BENEFICIARY_PIN_REQUIRED',
      });
    }
  }

  async changePin(
    organizationId: string,
    userId: string,
    newPin: string,
    opts: { oldPin?: string; password?: string },
  ): Promise<{ configured: boolean }> {
    if (!/^\d{4}$/.test(newPin)) {
      throw new BadRequestException('PIN must be exactly 4 digits.');
    }
    const configured = await this.isPinConfigured(organizationId);
    if (configured) {
      if (opts.oldPin) {
        const org = await this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { settings: true },
        });
        const hash = this.settingsRecord(org?.settings)[PIN_HASH_KEY] as string;
        const ok = await argon2.verify(hash, opts.oldPin);
        if (!ok) throw new UnauthorizedException('Current PIN is incorrect.');
      } else if (opts.password) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { passwordHash: true, organizationId: true },
        });
        if (!user?.passwordHash || user.organizationId !== organizationId) {
          throw new UnauthorizedException('Invalid password.');
        }
        const ok = await argon2.verify(user.passwordHash, opts.password);
        if (!ok) throw new UnauthorizedException('Invalid password.');
      } else {
        throw new BadRequestException('Provide current PIN or your account password.');
      }
    }
    return this.setPin(organizationId, newPin);
  }

  async setPin(organizationId: string, pin: string | null): Promise<{ configured: boolean }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    if (!org) throw new BadRequestException('Organization not found');

    const next = this.settingsRecord(org.settings);
    if (pin === null || pin === '') {
      delete next[PIN_HASH_KEY];
    } else {
      if (!/^\d{4}$/.test(pin)) {
        throw new BadRequestException('PIN must be exactly 4 digits.');
      }
      next[PIN_HASH_KEY] = await argon2.hash(pin, { type: argon2.argon2id });
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: next as object },
    });

    if (!pin) {
      await this.prisma.beneficiaryAccessGrant.deleteMany({ where: { organizationId } });
    }

    return { configured: !!next[PIN_HASH_KEY] };
  }

  async verifyPin(organizationId: string, userId: string, pin: string): Promise<{ expiresAt: string }> {
    if (!/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const hash = this.settingsRecord(org?.settings)[PIN_HASH_KEY];
    if (typeof hash !== 'string' || !hash) {
      return { expiresAt: new Date(Date.now() + GRANT_TTL_MS).toISOString() };
    }

    const ok = await argon2.verify(hash, pin);
    if (!ok) throw new UnauthorizedException('Invalid PIN.');

    const expiresAt = new Date(Date.now() + GRANT_TTL_MS);
    await this.prisma.beneficiaryAccessGrant.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, expiresAt },
      update: { expiresAt },
    });

    return { expiresAt: expiresAt.toISOString() };
  }
}
