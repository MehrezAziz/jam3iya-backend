import { z } from 'zod';

export function normalizeCinDigits(value: string | undefined | null): string | undefined {
  if (value == null || value === '') return undefined;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 0) return undefined;
  return digits;
}

export const optionalCinSchema = z
  .union([z.string(), z.undefined()])
  .optional()
  .transform((v) => normalizeCinDigits(v))
  .refine((v) => v === undefined || /^\d{8}$/.test(v), {
    message: 'CIN must be exactly 8 digits',
  });

export const requiredCinSchema = z
  .string()
  .min(1, 'CIN is required')
  .transform((v) => normalizeCinDigits(v) as string)
  .refine((v) => /^\d{8}$/.test(v), {
    message: 'CIN must be exactly 8 digits',
  });
