import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  DonorService,
  createDonorByOrgSchema,
  searchDonorsQuerySchema,
  type CreateDonorByOrgDto,
  type SearchDonorsQuery,
} from './donor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { AuditAction } from '../../common/decorators/audit.decorator';

@Controller('donors')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class DonorController {
  constructor(private readonly service: DonorService) {}

  @Post('accounts')
  @RequirePerm({ permissions: ['donor.update', 'donation.create.cash'], mode: 'any' })
  @AuditAction({ action: 'donor.create_by_org', resourceType: 'donor', captureDiff: true })
  createAccount(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(createDonorByOrgSchema)) dto: CreateDonorByOrgDto,
  ) {
    return this.service.createByOrganization(orgId, dto);
  }

  @Get('search')
  @RequirePerm('donor.read')
  search(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(searchDonorsQuerySchema)) query: SearchDonorsQuery,
  ) {
    return this.service.search(orgId, query);
  }
}
