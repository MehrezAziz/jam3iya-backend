import { z } from 'zod';

export const PHONE_DIGIT_COUNT = 8;
export const phoneValidationMessage = 'Phone must be exactly 8 digits';

export function normalizePhoneDigits(value: string | undefined | null): string | undefined {
  if (value == null || value === '') return undefined;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 0) return undefined;
  return digits;
}

export const optionalPhoneSchema = z
  .union([z.string(), z.undefined()])
  .optional()
  .transform((v) => normalizePhoneDigits(v))
  .refine((v) => v === undefined || /^\d{8}$/.test(v), {
    message: phoneValidationMessage,
  });

export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .transform((v) => normalizePhoneDigits(v) as string)
  .refine((v) => /^\d{8}$/.test(v), {
    message: phoneValidationMessage,
  });

/** Optional field that may be sent as empty string → null (platform admin profile). */
export const nullablePhoneSchema = z
  .string()
  .max(40)
  .optional()
  .transform((s) => {
    if (s === undefined) return undefined;
    const trimmed = s.trim();
    if (trimmed.length === 0) return null;
    return normalizePhoneDigits(trimmed) ?? null;
  })
  .refine((v) => v === undefined || v === null || /^\d{8}$/.test(v), {
    message: phoneValidationMessage,
  });
