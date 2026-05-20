import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';

@Controller('geo')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class GeoController {
  constructor(private readonly service: GeoService) {}

  /**
   * Tunisia reference data (governorates / delegations).
   * Public so platform admins can use it when creating an organization.
   */
  @Get('governorates')
  @Public()
  listGovernorates() {
    return this.service.listGovernorates();
  }

  @Get('governorates/:id/delegations')
  @Public()
  listDelegations(@Param('id', ParseIntPipe) id: number) {
    return this.service.listDelegations(id);
  }
}
