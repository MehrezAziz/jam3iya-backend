import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import {
  createBeneficiarySchema,
  CreateBeneficiaryDto,
  listBeneficiariesQuerySchema,
  ListBeneficiariesQuery,
  donationPickSearchQuerySchema,
  DonationPickSearchQuery,
  updateBeneficiarySchema,
  UpdateBeneficiaryDto,
  upsertSpouseSchema,
  UpsertSpouseDto,
  upsertChildSchema,
  UpsertChildDto,
  upsertDependentSchema,
  UpsertDependentDto,
  upsertJobSchema,
  UpsertJobDto,
  upsertHousingSchema,
  UpsertHousingDto,
  upsertDiseaseSchema,
  UpsertDiseaseDto,
  upsertSocialCoverageSchema,
  UpsertSocialCoverageDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class BeneficiaryController {
  constructor(private readonly service: BeneficiaryService) {}

  @Get()
  @RequirePerm('beneficiary.read.summary')
  @AuditAction({ action: 'beneficiary.list' })
  list(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listBeneficiariesQuerySchema)) query: ListBeneficiariesQuery,
  ) {
    return this.service.list(orgId, query, user.departmentId);
  }

  @Get('donation-pick-search')
  @RequirePerm({ permissions: ['donation.create.cash', 'beneficiary.read.summary'], mode: 'any' })
  @AuditAction({ action: 'beneficiary.donation_pick_search' })
  donationPickSearch(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(donationPickSearchQuerySchema)) query: DonationPickSearchQuery,
  ) {
    return this.service.searchForDonationPick(orgId, query);
  }

  @Post('rebuild-search-index')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.rebuild_search_index' })
  rebuildSearchIndex(@CurrentOrg() orgId: string) {
    return this.service.rebuildAllSearchIndexes(orgId);
  }

  @Get(':id/summary')
  @RequirePerm('beneficiary.read.summary')
  @AuditAction({ action: 'beneficiary.read.summary', resourceType: 'beneficiary', resourceIdParam: 'id' })
  readSummary(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.readSummary(orgId, id);
  }

  @Get(':id/full')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true, requires2faRecent: false })
  @AuditAction({
    action: 'beneficiary.read.full',
    resourceType: 'beneficiary',
    resourceIdParam: 'id',
  })
  readFull(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.readFull(orgId, id);
  }

  @Post()
  @RequirePerm('beneficiary.create')
  @AuditAction({ action: 'beneficiary.create', resourceType: 'beneficiary', captureDiff: true })
  create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBeneficiarySchema)) dto: CreateBeneficiaryDto,
  ) {
    if (user.departmentId) {
      dto.departmentId = user.departmentId;
    }
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.update', resourceType: 'beneficiary', resourceIdParam: 'id' })
  update(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBeneficiarySchema)) dto: UpdateBeneficiaryDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  // ----- Spouse ----------------------------------------------------------
  @Get(':id/spouse')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.spouse.read', resourceType: 'spouse', resourceIdParam: 'id',  })
  getSpouse(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.getSpouse(orgId, id);
  }

  @Put(':id/spouse')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.spouse.upsert', resourceType: 'spouse', resourceIdParam: 'id', captureDiff: true })
  upsertSpouse(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertSpouseSchema)) dto: UpsertSpouseDto,
  ) {
    return this.service.upsertSpouse(orgId, id, dto);
  }

  @Delete(':id/spouse')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.spouse.delete', resourceType: 'spouse', resourceIdParam: 'id' })
  deleteSpouse(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.deleteSpouse(orgId, id);
  }

  // ----- Children --------------------------------------------------------
  @Get(':id/children')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.children.read', resourceType: 'child', resourceIdParam: 'id',  })
  listChildren(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listChildren(orgId, id);
  }

  @Post(':id/children')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.child.add', resourceType: 'child', resourceIdParam: 'id', captureDiff: true })
  addChild(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertChildSchema)) dto: UpsertChildDto,
  ) {
    return this.service.addChild(orgId, id, dto);
  }

  @Patch(':id/children/:childId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.child.update', resourceType: 'child', resourceIdParam: 'childId', captureDiff: true })
  updateChild(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('childId') childId: string,
    @Body(new ZodValidationPipe(upsertChildSchema)) dto: UpsertChildDto,
  ) {
    return this.service.updateChild(orgId, id, childId, dto);
  }

  @Delete(':id/children/:childId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.child.delete', resourceType: 'child' })
  deleteChild(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('childId') childId: string,
  ) {
    return this.service.deleteChild(orgId, id, childId);
  }

  // ----- Dependents (under care) -----------------------------------------
  @Get(':id/dependents')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.dependents.read', resourceType: 'beneficiary', resourceIdParam: 'id' })
  listDependents(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listDependents(orgId, id);
  }

  @Post(':id/dependents')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.dependent.add', resourceType: 'dependent_person', resourceIdParam: 'id', captureDiff: true })
  addDependent(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertDependentSchema)) dto: UpsertDependentDto,
  ) {
    return this.service.addDependent(orgId, id, dto);
  }

  @Delete(':id/dependents/:dependentId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.dependent.delete', resourceType: 'dependent_person' })
  deleteDependent(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('dependentId') dependentId: string,
  ) {
    return this.service.deleteDependent(orgId, id, dependentId);
  }

  // ----- Social coverage -------------------------------------------------
  @Get(':id/social-coverages')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.social_coverage.read', resourceType: 'beneficiary', resourceIdParam: 'id',  })
  listSocialCoverages(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listSocialCoverages(orgId, id);
  }

  @Post(':id/social-coverages')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.social_coverage.add', resourceType: 'social_coverage', resourceIdParam: 'id', captureDiff: true })
  addSocialCoverage(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertSocialCoverageSchema)) dto: UpsertSocialCoverageDto,
  ) {
    return this.service.addSocialCoverage(orgId, id, dto);
  }

  @Delete(':id/social-coverages/:coverageId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.social_coverage.delete', resourceType: 'social_coverage' })
  deleteSocialCoverage(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('coverageId') coverageId: string,
  ) {
    return this.service.deleteSocialCoverage(orgId, id, coverageId);
  }

  // ----- Jobs ------------------------------------------------------------
  @Get(':id/jobs')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.jobs.read', resourceType: 'job', resourceIdParam: 'id',  })
  listJobs(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listJobs(orgId, id);
  }

  @Post(':id/jobs')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.job.add', resourceType: 'job', resourceIdParam: 'id', captureDiff: true })
  addJob(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertJobSchema)) dto: UpsertJobDto,
  ) {
    return this.service.addJob(orgId, id, dto);
  }

  @Delete(':id/jobs/:jobId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.job.delete', resourceType: 'job' })
  deleteJob(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('jobId') jobId: string,
  ) {
    return this.service.deleteJob(orgId, id, jobId);
  }

  // ----- Housing ---------------------------------------------------------
  @Get(':id/housing')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.housing.read', resourceType: 'housing', resourceIdParam: 'id',  })
  listHousing(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listHousing(orgId, id);
  }

  @Post(':id/housing')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.housing.add', resourceType: 'housing', resourceIdParam: 'id', captureDiff: true })
  addHousing(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertHousingSchema)) dto: UpsertHousingDto,
  ) {
    return this.service.addHousing(orgId, id, dto);
  }

  @Delete(':id/housing/:housingId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.housing.delete', resourceType: 'housing' })
  deleteHousing(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('housingId') housingId: string,
  ) {
    return this.service.deleteHousing(orgId, id, housingId);
  }

  // ----- Diseases --------------------------------------------------------
  @Get(':id/diseases')
  @RequirePerm({ permissions: 'beneficiary.read.full', requiresBeneficiaryAccess: true })
  @AuditAction({ action: 'beneficiary.diseases.read', resourceType: 'disease', resourceIdParam: 'id',  })
  listDiseases(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.listDiseases(orgId, id);
  }

  @Post(':id/diseases')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.disease.add', resourceType: 'disease', resourceIdParam: 'id', captureDiff: true })
  addDisease(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(upsertDiseaseSchema)) dto: UpsertDiseaseDto,
  ) {
    return this.service.addDisease(orgId, id, dto);
  }

  @Delete(':id/diseases/:diseaseId')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'beneficiary.disease.delete', resourceType: 'disease' })
  deleteDisease(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('diseaseId') diseaseId: string,
  ) {
    return this.service.deleteDisease(orgId, id, diseaseId);
  }
}
