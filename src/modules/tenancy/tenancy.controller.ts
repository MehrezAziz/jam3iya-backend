import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentOrg } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const createDeptSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  isMain: z.boolean().optional(),
});
type CreateDeptDto = z.infer<typeof createDeptSchema>;

@Controller()
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

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

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('organizations/me')
  @RequirePerm('org.read')
  myOrg(@CurrentOrg() orgId: string) {
    return this.tenancy.getOrganization(orgId);
  }

  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Get('departments')
  @RequirePerm('department.read')
  listDepartments(@CurrentOrg() orgId: string) {
    return this.tenancy.listDepartments(orgId);
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
