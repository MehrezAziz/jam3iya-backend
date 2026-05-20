import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const createTransferSchema = z.object({
  fromDepartmentId: z.string().uuid(),
  toDepartmentId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(500).optional(),
});

@Controller('treasury')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class TreasuryController {
  constructor(private readonly treasury: TreasuryService) {}

  @Get('balance')
  @RequirePerm('report.read.financial')
  async getBalance(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
  ) {
    let deptId = user.departmentId ?? departmentId;
    if (!deptId) {
      const canMain = await this.treasury.userHasMainDepartmentAccess(orgId, user.userId);
      if (canMain) deptId = (await this.treasury.getMainDepartmentId(orgId)) ?? undefined;
    }
    if (!deptId) throw new BadRequestException('departmentId is required');
    return this.treasury.getDepartmentBalance(orgId, deptId);
  }

  @Get('balances')
  @RequirePerm('report.read.financial')
  async listBalances(@CurrentOrg() orgId: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.departmentId) {
      return [await this.treasury.getDepartmentBalance(orgId, user.departmentId)];
    }
    return this.treasury.listAllBalances(orgId);
  }

  @Get('transfers')
  @RequirePerm('report.read.financial')
  listTransfers(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.treasury.listTransfers(orgId, user.departmentId, Number(limit) || 50);
  }

  @Post('transfers')
  @RequirePerm('report.read.financial')
  createTransfer(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTransferSchema)) dto: z.infer<typeof createTransferSchema>,
  ) {
    return this.treasury.createTransfer(orgId, user.userId, dto);
  }

  @Get('can-transfer')
  @RequirePerm('report.read.financial')
  async canTransfer(@CurrentOrg() orgId: string, @CurrentUser() user: AuthenticatedUser) {
    const allowed = await this.treasury.userHasMainDepartmentAccess(orgId, user.userId);
    return { allowed };
  }
}
