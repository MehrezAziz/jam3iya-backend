import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthorizationService } from '../authz/authorization.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  loginSchema,
  registerDonorSchema,
  verify2faSchema,
  LoginDto,
  RegisterDonorDto,
  Verify2faDto,
} from './dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request-context';
import type { Env } from '../../config/env';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
    private readonly authorization: AuthorizationService,
    private readonly prisma: PrismaService,
  ) {}

  // -----------------------------------------------------------------
  // Public endpoints
  // -----------------------------------------------------------------
  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ua = req.headers['user-agent'];
    const result = await this.authService.login(dto, req.ip, ua);
    if ('needsTwoFactor' in result) return result;
    this.setAuthCookies(res, result.accessToken, result.refreshToken, result.accessTokenMaxAgeSec, result.refreshTokenMaxAgeSec);
    return { user: result.user };
  }

  @Public()
  @Post('register-donor')
  async registerDonor(
    @Body(new ZodValidationPipe(registerDonorSchema)) dto: RegisterDonorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ua = req.headers['user-agent'];
    const result = await this.authService.registerDonor(dto, req.ip, ua);
    if ('needsTwoFactor' in result) return result;
    this.setAuthCookies(res, result.accessToken, result.refreshToken, result.accessTokenMaxAgeSec, result.refreshTokenMaxAgeSec);
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.authService.refresh(refreshToken, req.ip, req.headers['user-agent']);
    this.setAuthCookies(res, result.accessToken, result.refreshToken, result.accessTokenMaxAgeSec, result.refreshTokenMaxAgeSec);
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.['refresh_token'];
    if (refreshToken) await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  // -----------------------------------------------------------------
  // Authenticated endpoints
  // -----------------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const ctx = await this.authorization.loadUserContext(user);
    const roles = await this.prisma.role.findMany({
      where: { id: { in: ctx.roleIds } },
      select: { name: true, privilegeLevel: true, isSystem: true },
    });
    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, legalName: true, slug: true, defaultLanguage: true, defaultCurrency: true },
    });
    const isPlatformAdmin = roles.some((r) => r.name === 'platform_admin');
    return {
      user: {
        ...user,
        organization,
        roles: roles.map((r) => r.name),
        permissions: Array.from(ctx.permissions),
        isPlatformAdmin,
        maxPrivilegeLevel: ctx.maxPrivilegeLevel,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async beginTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.beginTwoFactorSetup(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  async confirmTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(verify2faSchema)) dto: Verify2faDto,
  ) {
    return this.authService.confirmTwoFactorSetup(user.userId, dto.code);
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    accessMaxAgeSec: number,
    refreshMaxAgeSec: number,
  ): void {
    const secure = this.config.get('COOKIE_SECURE', { infer: true });
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      maxAge: accessMaxAgeSec * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      maxAge: refreshMaxAgeSec * 1000,
      path: '/',
    });
  }

  private clearAuthCookies(res: Response): void {
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    res.clearCookie('access_token', { path: '/', domain });
    res.clearCookie('refresh_token', { path: '/', domain });
  }
}
