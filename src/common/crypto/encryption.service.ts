import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { KmsService } from './kms.service';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = 0x01;

/**
 * AES-256-GCM encryption with per-tenant DEK and AAD bound to
 * (organizationId, column) so ciphertext cannot be swapped between
 * fields or tenants.
 *
 * Wire format of returned Buffer:
 *   [0]      = version (0x01)
 *   [1..12]  = IV (12 bytes)
 *   [13..28] = auth tag (16 bytes)
 *   [29..]   = ciphertext
 */
@Injectable()
export class EncryptionService {
  constructor(private readonly kms: KmsService) {}

  encrypt(plaintext: string | Buffer, organizationId: string, column: string): Buffer {
    if (plaintext == null) {
      throw new Error('encrypt: plaintext is required');
    }
    const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
    const dek = this.kms.deriveDek(organizationId);
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, dek, iv, { authTagLength: TAG_LEN });
    cipher.setAAD(Buffer.from(`${organizationId}::${column}`, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    const out = Buffer.alloc(1 + IV_LEN + TAG_LEN + ciphertext.length);
    out[0] = VERSION;
    iv.copy(out, 1);
    tag.copy(out, 1 + IV_LEN);
    ciphertext.copy(out, 1 + IV_LEN + TAG_LEN);
    return out;
  }

  decryptToString(blob: Buffer | Uint8Array, organizationId: string, column: string): string {
    return this.decrypt(blob, organizationId, column).toString('utf8');
  }

  decrypt(blob: Buffer | Uint8Array, organizationId: string, column: string): Buffer {
    const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
    if (buf.length < 1 + IV_LEN + TAG_LEN) {
      throw new Error('Ciphertext too short');
    }
    const version = buf[0];
    if (version !== VERSION) {
      throw new Error(`Unsupported ciphertext version: ${version}`);
    }
    const iv = buf.subarray(1, 1 + IV_LEN);
    const tag = buf.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(1 + IV_LEN + TAG_LEN);

    const dek = this.kms.deriveDek(organizationId);
    const decipher = createDecipheriv(ALGO, dek, iv, { authTagLength: TAG_LEN });
    decipher.setAAD(Buffer.from(`${organizationId}::${column}`, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  encryptOptional(plaintext: string | null | undefined, organizationId: string, column: string): Buffer | null {
    if (plaintext == null || plaintext === '') return null;
    return this.encrypt(plaintext, organizationId, column);
  }

  decryptOptional(blob: Buffer | Uint8Array | null | undefined, organizationId: string, column: string): string | null {
    if (blob == null) return null;
    return this.decryptToString(blob, organizationId, column);
  }
}
