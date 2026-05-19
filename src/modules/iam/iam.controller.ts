import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { IamService } from './iam.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/request-context';

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(200),
});
type InviteDto = z.infer<typeof inviteSchema>;

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  departmentId: z.string().uuid(),
  roleId: z.string().uuid(),
});
type AssignRoleDto = z.infer<typeof assignRoleSchema>;

@Controller()
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class IamController {
  constructor(private readonly iam: IamService) {}

  @Get('users')
  @RequirePerm('user.read')
  listUsers(@CurrentOrg() orgId: string) {
    return this.iam.listUsers(orgId);
  }

  @Get('roles')
  @RequirePerm('role.read')
  listRoles(@CurrentOrg() orgId: string) {
    return this.iam.listRoles(orgId);
  }

  @Get('permissions')
  @RequirePerm('role.read')
  listPermissions() {
    return this.iam.listPermissions();
  }

  @Post('users/invite')
  @RequirePerm({ permissions: 'user.invite', requires2faRecent: true })
  invite(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteSchema)) dto: InviteDto,
  ) {
    return this.iam.inviteStaff(orgId, user.userId, dto);
  }

  @Post('users/assign-role')
  @RequirePerm({ permissions: 'user.assign_role', requires2faRecent: true })
  assignRole(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(assignRoleSchema)) dto: AssignRoleDto,
  ) {
    return this.iam.assignDepartmentRole(orgId, dto);
  }
}
