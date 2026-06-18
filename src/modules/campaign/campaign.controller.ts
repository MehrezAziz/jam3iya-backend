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
import { DonationService } from '../donation/donation.service';
import {
  createCampaignSchema,
  createOccasionSchema,
  updateCampaignSchema,
  updateOccasionSchema,
  type CreateCampaignDto,
  type CreateOccasionDto,
  type UpdateCampaignDto,
  type UpdateOccasionDto,
  addCampaignBeneficiarySchema,
  quickCampaignBeneficiarySchema,
  type AddCampaignBeneficiaryDto,
  type QuickCampaignBeneficiaryDto,
  updateBeneficiarySplitSchema,
  type UpdateBeneficiarySplitDto,
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
  constructor(
    private readonly service: CampaignService,
    private readonly donations: DonationService,
  ) {}

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

  @Get('campaigns/:id/donations')
  @RequirePerm({ permissions: ['campaign.read', 'donor.read'], mode: 'any' })
  listCampaignDonations(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.donations.listByCampaign(orgId, id);
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

  @Get('campaigns/:id/beneficiaries')
  @RequirePerm('campaign.read')
  listCampaignBeneficiaries(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listCampaignBeneficiaries(orgId, id);
  }

  @Post('campaigns/:id/beneficiaries')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.beneficiary.add', resourceType: 'campaign', resourceIdParam: 'id' })
  addCampaignBeneficiary(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addCampaignBeneficiarySchema)) dto: AddCampaignBeneficiaryDto,
  ) {
    return this.service.addCampaignBeneficiary(orgId, id, dto.beneficiaryId);
  }

  @Post('campaigns/:id/beneficiaries/quick')
  @RequirePerm({ permissions: ['campaign.manage', 'beneficiary.create'], mode: 'all' })
  @AuditAction({ action: 'campaign.beneficiary.quick_add', resourceType: 'campaign', resourceIdParam: 'id' })
  quickAddCampaignBeneficiary(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(quickCampaignBeneficiarySchema)) dto: QuickCampaignBeneficiaryDto,
  ) {
    return this.service.quickAddCampaignBeneficiary(orgId, id, dto);
  }

  @Delete('campaigns/:id/beneficiaries/:beneficiaryId')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.beneficiary.remove', resourceType: 'campaign', resourceIdParam: 'id' })
  removeCampaignBeneficiary(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('beneficiaryId') beneficiaryId: string,
  ) {
    return this.service.removeCampaignBeneficiary(orgId, id, beneficiaryId);
  }

  @Get('campaigns/:id/beneficiary-allocations')
  @RequirePerm('campaign.read')
  getBeneficiaryAllocations(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.getBeneficiaryAllocations(orgId, id);
  }

  @Patch('campaigns/:id/beneficiary-splits/:splitId')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.beneficiary_split.update', resourceType: 'campaign', resourceIdParam: 'id' })
  updateBeneficiarySplit(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('splitId') splitId: string,
    @Body(new ZodValidationPipe(updateBeneficiarySplitSchema)) dto: UpdateBeneficiarySplitDto,
  ) {
    return this.service.updateBeneficiarySplit(orgId, id, splitId, dto.amountMinor);
  }

  @Post('campaigns/:id/beneficiary-splits/:splitId/mark-paid')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.beneficiary_split.mark_paid', resourceType: 'campaign', resourceIdParam: 'id' })
  markBeneficiarySplitPaid(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('splitId') splitId: string,
  ) {
    return this.service.markBeneficiarySplitPaid(orgId, id, splitId);
  }

  @Post('campaigns/:id/beneficiary-splits/:splitId/unmark-paid')
  @RequirePerm('campaign.manage')
  @AuditAction({ action: 'campaign.beneficiary_split.unmark_paid', resourceType: 'campaign', resourceIdParam: 'id' })
  unmarkBeneficiarySplitPaid(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('splitId') splitId: string,
  ) {
    return this.service.unmarkBeneficiarySplitPaid(orgId, id, splitId);
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
