import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { DonationModule } from '../donation/donation.module';
import { BeneficiaryModule } from '../beneficiary/beneficiary.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [DonationModule, BeneficiaryModule, TenancyModule],
  providers: [CampaignService],
  controllers: [CampaignController],
  exports: [CampaignService],
})
export class CampaignModule {}
