import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  BillService,
  issueDonationReceiptSchema,
  listBillsQuerySchema,
  type IssueDonationReceiptDto,
  type ListBillsQuery,
} from './bill.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/request-context';

@Controller('bills')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class BillController {
  constructor(private readonly service: BillService) {}

  @Get()
  @RequirePerm('bill.read')
  list(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(listBillsQuerySchema)) query: ListBillsQuery,
  ) {
    return this.service.list(orgId, query);
  }

  @Post('donation-receipt')
  @RequirePerm('bill.issue')
  @AuditAction({ action: 'bill.issue.donation', resourceType: 'bill', captureDiff: true })
  issueDonationReceipt(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(issueDonationReceiptSchema)) dto: IssueDonationReceiptDto,
  ) {
    return this.service.issueDonationReceipt(orgId, user.userId, dto);
  }
}
