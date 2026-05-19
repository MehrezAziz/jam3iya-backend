import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DistributionService } from './distribution.service';
import {
  cancelDistributionSchema,
  createDistributionSchema,
  deliverDistributionSchema,
  listDistributionsQuerySchema,
  updateDistributionSchema,
  type CancelDistributionDto,
  type CreateDistributionDto,
  type DeliverDistributionDto,
  type ListDistributionsQuery,
  type UpdateDistributionDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/request-context';

@Controller('distributions')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class DistributionController {
  constructor(private readonly service: DistributionService) {}

  @Get()
  @RequirePerm('distribution.read')
  list(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(listDistributionsQuerySchema)) query: ListDistributionsQuery,
  ) {
    return this.service.list(orgId, query);
  }

  @Get(':id')
  @RequirePerm('distribution.read')
  get(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.get(orgId, id);
  }

  @Post()
  @RequirePerm('distribution.plan')
  @AuditAction({ action: 'distribution.create', resourceType: 'distribution', captureDiff: true })
  create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createDistributionSchema)) dto: CreateDistributionDto,
  ) {
    return this.service.create(orgId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePerm('distribution.plan')
  @AuditAction({ action: 'distribution.update', resourceType: 'distribution', captureDiff: true, resourceIdParam: 'id' })
  update(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDistributionSchema)) dto: UpdateDistributionDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Patch(':id/deliver')
  @RequirePerm('distribution.deliver')
  @AuditAction({ action: 'distribution.deliver', resourceType: 'distribution', captureDiff: true, resourceIdParam: 'id' })
  deliver(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(deliverDistributionSchema)) dto: DeliverDistributionDto,
  ) {
    return this.service.deliver(orgId, user.userId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePerm('distribution.cancel')
  @AuditAction({ action: 'distribution.cancel', resourceType: 'distribution', captureDiff: true, resourceIdParam: 'id' })
  cancel(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelDistributionSchema)) dto: CancelDistributionDto,
  ) {
    return this.service.cancel(orgId, id, dto);
  }
}
