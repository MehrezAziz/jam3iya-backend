import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentUser, CurrentOrg } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request-context';

@Controller('audit')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('mine')
  @RequirePerm('audit.read.own')
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrg() orgId: string,
    @Query('limit') limit = '50',
  ) {
    const take = Math.min(Number(limit) || 50, 200);
    return this.prisma.auditLog.findMany({
      where: { organizationId: orgId, actorUserId: user.userId },
      orderBy: { at: 'desc' },
      take,
    });
  }

  @Get('organization')
  @RequirePerm('audit.read.organization')
  async listOrg(@CurrentOrg() orgId: string, @Query('limit') limit = '100') {
    const take = Math.min(Number(limit) || 100, 500);
    return this.prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { at: 'desc' },
      take,
    });
  }
}
