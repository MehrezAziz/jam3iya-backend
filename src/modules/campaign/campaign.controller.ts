import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import {
  createCampaignSchema,
  createOccasionSchema,
  updateCampaignSchema,
  updateOccasionSchema,
  type CreateCampaignDto,
  type CreateOccasionDto,
  type UpdateCampaignDto,
  type UpdateOccasionDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller()
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class CampaignController {
  constructor(private readonly service: CampaignService) {}

  // ---------- Campaigns ----------
  @Get('campaigns')
  @RequirePerm('campaign.read')
  listCampaigns(@CurrentOrg() orgId: string) {
    return this.service.listCampaigns(orgId);
  }

  @Get('campaigns/:id')
  @RequirePerm('campaign.read')
  getCampaign(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.getCampaign(orgId, id);
  }

  @Post('campaigns')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.create', resourceType: 'campaign', captureDiff: true })
  createCampaign(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto,
  ) {
    return this.service.createCampaign(orgId, dto);
  }

  @Patch('campaigns/:id')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.update', resourceType: 'campaign', captureDiff: true, resourceIdParam: 'id' })
  updateCampaign(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) dto: UpdateCampaignDto,
  ) {
    return this.service.updateCampaign(orgId, id, dto);
  }

  @Delete('campaigns/:id')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.delete', resourceType: 'campaign', resourceIdParam: 'id' })
  deleteCampaign(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.deleteCampaign(orgId, id);
  }

  // ---------- Occasions ----------
  @Get('occasions')
  @RequirePerm('occasion.read')
  listOccasions(@CurrentOrg() orgId: string) {
    return this.service.listOccasions(orgId);
  }

  @Post('occasions')
  @RequirePerm('occasion.manage')
  @AuditAction({ action: 'occasion.create', resourceType: 'occasion', captureDiff: true })
  createOccasion(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(createOccasionSchema)) dto: CreateOccasionDto,
  ) {
    return this.service.createOccasion(orgId, dto);
  }

  @Patch('occasions/:id')
  @RequirePerm('occasion.manage')
  @AuditAction({ action: 'occasion.update', resourceType: 'occasion', captureDiff: true, resourceIdParam: 'id' })
  updateOccasion(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOccasionSchema)) dto: UpdateOccasionDto,
  ) {
    return this.service.updateOccasion(orgId, id, dto);
  }

  @Delete('occasions/:id')
  @RequirePerm('occasion.manage')
  @AuditAction({ action: 'occasion.delete', resourceType: 'occasion', resourceIdParam: 'id' })
  deleteOccasion(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.deleteOccasion(orgId, id);
  }
}
