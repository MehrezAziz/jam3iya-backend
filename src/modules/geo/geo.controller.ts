import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';

@Controller('geo')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class GeoController {
  constructor(private readonly service: GeoService) {}

  @Get('governorates')
  @RequirePerm('beneficiary.read.summary')
  listGovernorates() {
    return this.service.listGovernorates();
  }

  @Get('governorates/:id/delegations')
  @RequirePerm('beneficiary.read.summary')
  listDelegations(@Param('id', ParseIntPipe) id: number) {
    return this.service.listDelegations(id);
  }
}
