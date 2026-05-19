import { Module } from '@nestjs/common';
import { IamService } from './iam.service';
import { IamController } from './iam.controller';

@Module({
  providers: [IamService],
  controllers: [IamController],
  exports: [IamService],
})
export class IamModule {}
