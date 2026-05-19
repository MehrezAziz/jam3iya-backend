import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/request-context';
import { PlatformService } from './platform.service';
import {
  createOrganizationSchema,
  CreateOrganizationDto,
  updateOrganizationSchema,
  UpdateOrganizationDto,
  suspendOrganizationSchema,
  SuspendOrganizationDto,
} from './dto';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
@Controller('platform/organizations')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePerm('platform.org.read_all')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.platform.listOrganizations(user.userId);
  }

  @Get(':id')
  @RequirePerm('platform.org.read_all')
  get(@Param('id') id: string) {
    return this.platform.getOrganization(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePerm('platform.org.create')
  @AuditAction({
    action: 'platform.org.create',
    resourceType: 'organization',
    captureDiff: true,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrganizationSchema)) dto: CreateOrganizationDto,
  ) {
    return this.platform.createOrganization(user.userId, dto);
  }

  @Patch(':id')
  @RequirePerm('platform.org.update')
  @AuditAction({
    action: 'platform.org.update',
    resourceType: 'organization',
    resourceIdParam: 'id',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) dto: UpdateOrganizationDto,
  ) {
    return this.platform.updateOrganization(user.userId, id, dto);
  }

  @Patch(':id/suspend')
  @RequirePerm('platform.org.suspend')
  @AuditAction({
    action: 'platform.org.suspend',
    resourceType: 'organization',
    resourceIdParam: 'id',
    includeReason: true,
  })
  suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(suspendOrganizationSchema)) dto: SuspendOrganizationDto,
  ) {
    return this.platform.setSuspended(user.userId, id, dto);
  }
}
