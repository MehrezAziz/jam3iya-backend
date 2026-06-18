import { Module } from '@nestjs/common';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { BeneficiaryModule } from '../beneficiary/beneficiary.module';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';

@Module({
  imports: [CryptoModule, TreasuryModule, BeneficiaryModule],
  providers: [DonationService],
  controllers: [DonationController],
  exports: [DonationService],
})
export class DonationModule {}
