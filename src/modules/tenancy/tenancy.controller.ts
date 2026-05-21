import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { z } from 'zod';
import { TenancyService } from './tenancy.service';
import { BeneficiaryAccessService } from './beneficiary-access.service';
import { FilesService } from '../files/files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const createDeptSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    isMain: z.boolean().optional(),
    loginEmail: z.string().email().max(254).transform((s) => s.toLowerCase()).optional(),
    password: z.string().min(12, 'Password must be at least 12 characters').max(200).optional(),
  })
  .refine((d) => !d.loginEmail || d.password, {
    message: 'Password is required when a department login email is set',
    path: ['password'],
  })
  .refine((d) => !d.password || d.loginEmail, {
    message: 'Login email is required when a department password is set',
    path: ['loginEmail'],
  });
type CreateDeptDto = z.infer<typeof createDeptSchema>;

const setPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/).nullable(),
});
type SetPinDto = z.infer<typeof setPinSchema>;

const changePinSchema = z
  .object({
    newPin: z.string().regex(/^\d{4}$/),
    oldPin: z.string().regex(/^\d{4}$/).optional(),
    password: z.string().min(8).max(200).optional(),
  })
  .refine((d) => !!d.oldPin || !!d.password, {
    message: 'Provide current PIN or account password',
  });
type ChangePinDto = z.infer<typeof changePinSchema>;

const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});
type VerifyPinDto = z.infer<typeof verifyPinSchema>;

@Controller()
export class TenancyController {
  constructor(
    private readonly tenancy: TenancyService,
    private readonly beneficiaryAccess: BeneficiaryAccessService,
    private readonly files: FilesService,
  ) {}

  @Public()
  @Get('public/orgs/:slug')
  publicOrg(@Param('slug') slug: string) {
    return this.tenancy.getOrganizationBySlug(slug);
  }

  @Public()
  @Get('public/orgs/:slug/stats')
  async publicOrgStats(@Param('slug') slug: string) {
    const org = await this.tenancy.getOrganizationBySlug(slug);
    const stats = await this.tenancy.getPublicStats(org.id);
    return { organization: org, ...stats };
  }

  @Public()
  @Get('public/orgs/:slug/donations/:donationId')
  publicDonationVerification(
    @Param('slug') slug: string,
    @Param('donationId') donationId: string,
  ) {
    return this.tenancy.getPublicDonationVerification(slug, donationId);
  }

  @Public()
  @Get('public/orgs/:slug/logo')
  async getPublicOrganizationLogo(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const org = await this.tenancy.findActiveOrganizationBySlug(slug);
    if (!org.logoFileId) throw new NotFoundException('Organization logo not set');
    const streamable = await this.files.downloadFile(org.id, org.logoFileId);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return streamable;
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('organizations/me')
  @RequirePerm('org.read')
  myOrg(@CurrentOrg() orgId: string) {
    return this.tenancy.getOrganization(orgId);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('organizations/me/logo')
  @RequirePerm({ permissions: ['org.read', 'bill.read'], mode: 'any' })
  async getOrganizationLogo(@CurrentOrg() orgId: string, @Res({ passthrough: true }) res: Response) {
    const org = await this.tenancy.downloadOrganizationLogo(orgId);
    if (!org?.logoFileId) throw new NotFoundException('Organization logo not set');
    const streamable = await this.files.downloadFile(orgId, org.logoFileId);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return streamable;
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Put('organizations/me/logo')
  @RequirePerm('org.manage_settings')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  setOrganizationLogo(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    return this.tenancy.setOrganizationLogo(orgId, user.userId, file);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Delete('organizations/me/logo')
  @RequirePerm('org.manage_settings')
  clearOrganizationLogo(@CurrentOrg() orgId: string) {
    return this.tenancy.clearOrganizationLogo(orgId);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('departments')
  @RequirePerm('department.read')
  listDepartments(@CurrentOrg() orgId: string) {
    return this.tenancy.listDepartments(orgId);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('organizations/me/beneficiary-access')
  @RequirePerm('beneficiary.read.full')
  async beneficiaryAccessStatus(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const [pinConfigured, accessGranted] = await Promise.all([
      this.beneficiaryAccess.isPinConfigured(orgId),
      this.beneficiaryAccess.hasActiveGrant(orgId, user.userId),
    ]);
    return { pinConfigured, accessGranted };
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Put('organizations/me/beneficiary-access-pin')
  @RequirePerm('org.manage_settings')
  setBeneficiaryPin(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(setPinSchema)) dto: SetPinDto,
  ) {
    return this.beneficiaryAccess.setPin(orgId, dto.pin);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Put('organizations/me/beneficiary-access-pin/change')
  @RequirePerm('org.manage_settings')
  changeBeneficiaryPin(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePinSchema)) dto: ChangePinDto,
  ) {
    return this.beneficiaryAccess.changePin(orgId, user.userId, dto.newPin, {
      oldPin: dto.oldPin,
      password: dto.password,
    });
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Post('organizations/me/beneficiary-access-pin/verify')
  @RequirePerm('beneficiary.read.full')
  verifyBeneficiaryPin(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(verifyPinSchema)) dto: VerifyPinDto,
  ) {
    return this.beneficiaryAccess.verifyPin(orgId, user.userId, dto.pin);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('departments/main')
  @RequirePerm('department.read')
  mainDepartment(@CurrentOrg() orgId: string) {
    return this.tenancy.getMainDepartment(orgId);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Put('departments/main/location')
  @RequirePerm('org.manage_settings')
  updateMainDepartmentLocation(
    @CurrentOrg() orgId: string,
    @Body() body: { region?: string | null; city?: string | null },
  ) {
    return this.tenancy.updateMainDepartmentLocation(orgId, body);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Post('departments')
  @RequirePerm('department.create')
  createDepartment(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(createDeptSchema)) dto: CreateDeptDto,
  ) {
    return this.tenancy.createDepartment(orgId, dto);
  }
}
