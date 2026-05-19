import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';
import type { Env } from '../../config/env';

/**
 * Mock KMS. In production this is replaced by a real KMS / Vault adapter
 * that wraps a per-tenant Data Encryption Key (DEK) with a Customer Master
 * Key (CMK) that never leaves the HSM.
 *
 * Here, per-tenant DEKs are derived deterministically from the master
 * encryption key + organization id using HKDF-like construction:
 *   DEK = HMAC-SHA256(masterKey, "dek::v1::" || organizationId)
 *
 * The same approach derives the per-tenant search pepper used for HMAC
 * of searchable encrypted columns.
 */
@Injectable()
export class KmsService {
  private readonly logger = new Logger(KmsService.name);
  private readonly masterKey: Buffer;
  private readonly pepperRoot: Buffer;

  constructor(private readonly config: ConfigService<Env, true>) {
    const masterB64 = this.config.get('MASTER_ENCRYPTION_KEY', { infer: true });
    this.masterKey = Buffer.from(masterB64, 'base64');
    if (this.masterKey.length < 32) {
      // Pad / hash to a stable 32 bytes if the operator passed a short key in dev
      this.logger.warn('MASTER_ENCRYPTION_KEY is < 32 bytes, hashing it to 32 bytes for dev');
      this.masterKey = createHash('sha256').update(masterB64).digest();
    }
    const pepperSeed = this.config.get('SEARCH_PEPPER', { infer: true });
    this.pepperRoot = createHash('sha256').update(pepperSeed).digest();
  }

  deriveDek(organizationId: string, version = 1): Buffer {
    return createHmac('sha256', this.masterKey)
      .update(`dek::v${version}::${organizationId}`)
      .digest();
  }

  derivePepper(organizationId: string, version = 1): Buffer {
    return createHmac('sha256', this.pepperRoot)
      .update(`pep::v${version}::${organizationId}`)
      .digest();
  }

  generateRandomBytes(size: number): Buffer {
    return randomBytes(size);
  }
}
