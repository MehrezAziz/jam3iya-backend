import { Global, Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { TenancyController } from './tenancy.controller';
import { BeneficiaryAccessService } from './beneficiary-access.service';

/** Global so AuthorizationGuard can inject BeneficiaryAccessService from any feature module. */
@Global()
@Module({
  providers: [TenancyService, BeneficiaryAccessService],
  controllers: [TenancyController],
  exports: [TenancyService, BeneficiaryAccessService],
})
export class TenancyModule {}
