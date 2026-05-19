import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { KmsService } from './kms.service';

/**
 * Deterministic HMAC-SHA256 used for searchable encrypted columns
 * (e.g. cin_hash, full_name_hash). The pepper is per-tenant so the same
 * plaintext value in two different orgs produces two different hashes —
 * preventing cross-tenant correlation.
 *
 * Names / CINs are normalized (NFKC, lower-case, collapsed whitespace)
 * before hashing so trivial typing differences still match.
 */
@Injectable()
export class HashService {
  constructor(private readonly kms: KmsService) {}

  hash(value: string, organizationId: string, column: string): Buffer {
    const pepper = this.kms.derivePepper(organizationId);
    const normalized = this.normalize(value);
    return createHmac('sha256', pepper)
      .update(`${column}::${normalized}`)
      .digest();
  }

  hashOptional(value: string | null | undefined, organizationId: string, column: string): Buffer | null {
    if (value == null || value === '') return null;
    return this.hash(value, organizationId, column);
  }

  /**
   * Network-wide pepper for cross-org dedup. Uses a stable, non-tenant
   * value so the same CIN produces the same hash across all participating
   * orgs. The pepper itself is still secret to the dedup service.
   */
  networkHash(value: string, column: string, networkPepper: Buffer): Buffer {
    return createHmac('sha256', networkPepper)
      .update(`${column}::${this.normalize(value)}`)
      .digest();
  }

  private normalize(value: string): string {
    return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
