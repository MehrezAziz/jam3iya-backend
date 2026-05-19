import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { IamModule } from './modules/iam/iam.module';
import { BeneficiaryModule } from './modules/beneficiary/beneficiary.module';
import { DonationModule } from './modules/donation/donation.module';
import { HealthModule } from './modules/health/health.module';
import { AuthzModule } from './modules/authz/authz.module';
import { AuditModule } from './modules/audit/audit.module';
import { PlatformModule } from './modules/platform/platform.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { FilesModule } from './modules/files/files.module';
import { BillModule } from './modules/bill/bill.module';
import { GeoModule } from './modules/geo/geo.module';
import { DonorModule } from './modules/donor/donor.module';
import type { Env } from './config/env';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    CryptoModule,
    AuthzModule,
    TenancyModule,
    AuditModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('THROTTLE_TTL', { infer: true }) * 1000,
          limit: config.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    AuthModule,
    PlatformModule,
    IamModule,
    BeneficiaryModule,
    DonationModule,
    InventoryModule,
    DistributionModule,
    CampaignModule,
    FilesModule,
    BillModule,
    GeoModule,
    DonorModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
