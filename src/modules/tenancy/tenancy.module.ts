import { Global, Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { TenancyController } from './tenancy.controller';
import { BeneficiaryAccessService } from './beneficiary-access.service';
import { FilesModule } from '../files/files.module';

/** Global so AuthorizationGuard can inject BeneficiaryAccessService from any feature module. */
@Global()
@Module({
  imports: [FilesModule],
  providers: [TenancyService, BeneficiaryAccessService],
  controllers: [TenancyController],
  exports: [TenancyService, BeneficiaryAccessService],
})
export class TenancyModule {}
