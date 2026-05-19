import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import type { Env } from '../../config/env';
import type { LoginDto, RegisterDonorDto } from './dto';
import type { AccessTokenPayload } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenMaxAgeSec: number;
  refreshTokenMaxAgeSec: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {
    authenticator.options = { window: 1, step: 30 };
  }

  // -------------------------------------------------------------------
  // Login / sessions
  // -------------------------------------------------------------------
  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<LoginResult> {
    const user = await this.findUserForLogin(dto.email, dto.organizationSlug);
    if (!user || !user.passwordHash || user.status === 'locked' || user.deletedAt) {
      // Constant-time-ish failure
      await this.fakeHashCompare();
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      await this.handleFailedLogin(user.id, user.failedLoginCount + 1);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2FA
    let twoFactorVerifiedAt: number | undefined;
    if (user.twoFactorEnabled) {
      const tf = await this.prisma.userTwoFactor.findFirst({
        where: { userId: user.id, method: 'totp', confirmedAt: { not: null }, deletedAt: null },
      });
      if (!tf) {
        // user has 2FA flag but no confirmed factor — should not happen, fail safe
        throw new UnauthorizedException('Two-factor configuration error');
      }
      if (!dto.twoFactorCode) {
        // Tell client to prompt for code
        return { needsTwoFactor: true };
      }
      const secret = this.encryption.decryptToString(tf.secretEnc, user.organizationId, 'two_factor_secret');
      const valid = authenticator.check(dto.twoFactorCode, secret);
      if (!valid) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
      twoFactorVerifiedAt = Math.floor(Date.now() / 1000);
      await this.prisma.userTwoFactor.update({
        where: { id: tf.id },
        data: { lastUsedAt: new Date() },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    const tokens = await this.issueTokens(user, twoFactorVerifiedAt, ip, userAgent);
    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.id,
      actorIp: ip ?? null,
      actorUserAgent: userAgent ?? null,
      action: 'auth.login',
      outcome: 'allow',
    });
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string): Promise<SessionTokens & { user: PublicUser }> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({ where: { refreshTokenHash: tokenHash } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.id !== payload.sid) {
      // Token reuse: revoke whole family
      if (session && !session.revokedAt) {
        await this.prisma.userSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date(), revokedReason: 'reuse_detected' },
        });
      }
      throw new UnauthorizedException('Refresh token invalid or revoked');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt || user.status !== 'active') {
      throw new UnauthorizedException('User not active');
    }

    // Rotate: revoke old, issue new
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: 'rotated' },
    });

    const tokens = await this.issueTokens(user, payload.t2v, ip, userAgent);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.userSession
      .updateMany({
        where: { refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'logout' },
      })
      .catch(() => undefined);
  }

  // -------------------------------------------------------------------
  // Donor self-registration
  // -------------------------------------------------------------------
  async registerDonor(dto: RegisterDonorDto, ip?: string, userAgent?: string): Promise<LoginResult> {
    const org = await this.prisma.organization.findUnique({ where: { slug: dto.organizationSlug } });
    if (!org) throw new NotFoundException('Organization not found');
    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId: org.id, email: dto.email } },
    });
    if (existing) throw new ConflictException('Email already in use for this organization');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          organizationId: org.id,
          kind: 'donor',
          email: dto.email,
          fullName: dto.fullName,
          phone: dto.phone,
          passwordHash,
          status: 'active',
          locale: dto.locale,
          lastPasswordChangeAt: new Date(),
          emailVerifiedAt: null, // verification email is sent separately
        },
      });
      await tx.donor.create({
        data: {
          id: u.id,
          organizationId: org.id,
          displayPseudo: dto.pseudo ?? null,
          acceptsTaxReceipt: dto.acceptsTaxReceipt ?? false,
          fiscalId: dto.fiscalId ?? null,
        },
      });
      return u;
    });

    const tokens = await this.issueTokens(user, undefined, ip, userAgent);
    await this.audit.log({
      organizationId: org.id,
      actorUserId: user.id,
      actorIp: ip ?? null,
      actorUserAgent: userAgent ?? null,
      action: 'auth.register_donor',
      resourceType: 'user',
      resourceId: user.id,
    });
    return { ...tokens, user: this.toPublicUser(user) };
  }

  // -------------------------------------------------------------------
  // 2FA setup
  // -------------------------------------------------------------------
  async beginTwoFactorSetup(userId: string): Promise<TwoFactorSetupResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    if (user.twoFactorEnabled) throw new ConflictException('Two-factor already enabled');

    const secret = authenticator.generateSecret(20);
    const issuer = 'Jam3iya';
    const label = `${issuer}:${user.email}`;
    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    const qr = await QRCode.toDataURL(otpauthUrl);

    const secretEnc = this.encryption.encrypt(secret, user.organizationId, 'two_factor_secret');

    // Upsert a pending factor (not confirmed yet)
    await this.prisma.userTwoFactor.upsert({
      where: { userId_method: { userId: user.id, method: 'totp' } },
      create: { userId: user.id, method: 'totp', secretEnc },
      update: { secretEnc, confirmedAt: null },
    });

    return { otpauthUrl, qrDataUrl: qr, label };
  }

  async confirmTwoFactorSetup(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const tf = await this.prisma.userTwoFactor.findFirst({
      where: { userId: user.id, method: 'totp', deletedAt: null },
    });
    if (!tf) throw new NotFoundException('No pending two-factor setup');
    const secret = this.encryption.decryptToString(tf.secretEnc, user.organizationId, 'two_factor_secret');
    if (!authenticator.check(code, secret)) {
      throw new BadRequestException('Invalid code');
    }
    const recoveryCodes = Array.from({ length: 10 }, () => this.generateRecoveryCode());
    const recoveryHashes = recoveryCodes.map((c) => createHash('sha256').update(c).digest('hex'));
    const recoveryEnc = this.encryption.encrypt(JSON.stringify(recoveryHashes), user.organizationId, 'two_factor_recovery');

    await this.prisma.$transaction([
      this.prisma.userTwoFactor.update({
        where: { id: tf.id },
        data: { confirmedAt: new Date(), recoveryCodesEnc: recoveryEnc },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } }),
    ]);
    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.two_factor_enabled',
      outcome: 'allow',
    });
    return { recoveryCodes };
  }

  async disableTwoFactor(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException('User not found');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid password');
    await this.prisma.$transaction([
      this.prisma.userTwoFactor.updateMany({
        where: { userId: user.id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } }),
    ]);
    await this.audit.log({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.two_factor_disabled',
      outcome: 'allow',
    });
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  private async findUserForLogin(email: string, organizationSlug?: string) {
    if (organizationSlug) {
      const org = await this.prisma.organization.findUnique({ where: { slug: organizationSlug } });
      if (!org) return null;
      return this.prisma.user.findUnique({
        where: { organizationId_email: { organizationId: org.id, email } },
      });
    }
    // No org slug provided: only works if email is globally unique.
    const matches = await this.prisma.user.findMany({ where: { email }, take: 2 });
    if (matches.length === 1) return matches[0];
    return null;
  }

  private async handleFailedLogin(userId: string, newCount: number): Promise<void> {
    const lockTimes: Record<number, number> = { 5: 1 * 60 * 1000, 10: 15 * 60 * 1000, 20: 60 * 60 * 1000 };
    const lockMs = lockTimes[newCount];
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newCount,
        lockedUntil: lockMs ? new Date(Date.now() + lockMs) : undefined,
      },
    });
  }

  private async fakeHashCompare(): Promise<void> {
    // Constant-time-ish; avoid leaking timing on user existence.
    await argon2.verify(
      '$argon2id$v=19$m=65536,t=3,p=4$YWFhYWFhYWFhYWFhYWFhYQ$cN0Vn3uHmJ7DK2x3qj2tnNZeBz1H8GbBPnYbQbCQOXc',
      'placeholder',
    ).catch(() => undefined);
  }

  private async issueTokens(
    user: { id: string; organizationId: string; kind: 'staff' | 'donor'; email: string; fullName: string },
    twoFactorVerifiedAt: number | undefined,
    ip?: string,
    userAgent?: string,
  ): Promise<SessionTokens> {
    const sessionId = randomUUID();
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      org: user.organizationId,
      knd: user.kind,
      eml: user.email,
      nm: user.fullName,
      sid: sessionId,
      t2v: twoFactorVerifiedAt,
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: accessTtl,
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      t2v: twoFactorVerifiedAt,
    };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: refreshTtl,
    });

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenMaxAgeSec: accessTtl,
      refreshTokenMaxAgeSec: refreshTtl,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRecoveryCode(): string {
    return randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)?.join('-') ?? randomBytes(8).toString('hex');
  }

  private toPublicUser(user: {
    id: string;
    organizationId: string;
    kind: 'staff' | 'donor';
    email: string;
    fullName: string;
    twoFactorEnabled: boolean;
    locale: string;
  }): PublicUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      kind: user.kind,
      email: user.email,
      fullName: user.fullName,
      twoFactorEnabled: user.twoFactorEnabled,
      locale: user.locale,
    };
  }
}

export interface PublicUser {
  id: string;
  organizationId: string;
  kind: 'staff' | 'donor';
  email: string;
  fullName: string;
  twoFactorEnabled: boolean;
  locale: string;
}

export type LoginResult =
  | { needsTwoFactor: true }
  | (SessionTokens & { user: PublicUser });

export interface TwoFactorSetupResult {
  otpauthUrl: string;
  qrDataUrl: string;
  label: string;
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  t2v?: number;
}
