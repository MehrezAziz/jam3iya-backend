import { Global, Module } from '@nestjs/common';
import { KmsService } from './kms.service';
import { EncryptionService } from './encryption.service';
import { HashService } from './hash.service';

@Global()
@Module({
  providers: [KmsService, EncryptionService, HashService],
  exports: [KmsService, EncryptionService, HashService],
})
export class CryptoModule {}
