import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  DonationService,
  createCashDonationSchema,
  createInKindDonationSchema,
  listDonationsQuerySchema,
  CreateCashDonationDto,
  CreateInKindDonationDto,
  ListDonationsQuery,
} from './donation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/request-context';

@Controller('donations')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class DonationController {
  constructor(private readonly service: DonationService) {}

  @Get()
  @RequirePerm({ permissions: ['donor.read', 'donation.create.cash'], mode: 'any' })
  list(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listDonationsQuerySchema)) query: ListDonationsQuery,
  ) {
    return this.service.list(orgId, query, user.departmentId);
  }

  @Get('mine')
  @RequirePerm('me.donation.read')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.service.listMine(user.userId, Number(limit) || 50, Number(offset) || 0);
  }

  @Get('my-receipts')
  @RequirePerm('me.receipt.download')
  listMyReceipts(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyReceipts(user.userId);
  }

  @Get('stats')
  @RequirePerm('report.read.financial')
  async stats(@CurrentOrg() orgId: string, @CurrentUser() user: AuthenticatedUser) {
    const isMainViewer = await this.service.canViewOrgTreasury(orgId, user.userId);
    const scopeDepartmentId =
      user.departmentId && !isMainViewer ? user.departmentId : undefined;
    return this.service.stats(
      orgId,
      scopeDepartmentId,
      isMainViewer,
      user.departmentId,
      user.userId,
    );
  }

  @Get(':id')
  @RequirePerm({ permissions: ['donor.read', 'donation.create.cash'], mode: 'any' })
  getById(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.getById(orgId, id, user.departmentId);
  }

  @Post('cash')
  @RequirePerm('donation.create.cash')
  @AuditAction({ action: 'donation.create.cash', resourceType: 'donation', captureDiff: true })
  createCash(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCashDonationSchema)) dto: CreateCashDonationDto,
  ) {
    return this.service.createCash(orgId, user.userId, user.departmentId, dto);
  }

  @Post('in-kind')
  @RequirePerm('donation.create.in_kind')
  @AuditAction({ action: 'donation.create.in_kind', resourceType: 'donation', captureDiff: true })
  createInKind(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createInKindDonationSchema)) dto: CreateInKindDonationDto,
  ) {
    return this.service.createInKind(orgId, user.userId, dto);
  }
}
