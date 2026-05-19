import { Module } from '@nestjs/common';
import { DonorService } from './donor.service';
import { DonorController } from './donor.controller';

@Module({
  providers: [DonorService],
  controllers: [DonorController],
  exports: [DonorService],
})
export class DonorModule {}
