import { z } from 'zod';
import { nullablePhoneSchema, optionalPhoneSchema } from '../../common/validators/phone';

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

export const createOrganizationSchema = z
  .object({
    legalName: z.string().min(2).max(200),
    slug: z
      .string()
      .min(3)
      .max(50)
      .regex(slugRegex, 'Slug must be lowercase alphanumeric with dashes (no leading/trailing dash)')
      .refine((s) => !s.startsWith('__'), 'Reserved prefix'),
    country: z.string().length(2).default('TN'),
    defaultCurrency: z.string().length(3).default('TND'),
    defaultLanguage: z.enum(['ar', 'fr', 'en']).default('ar'),
    timezone: z.string().default('Africa/Tunis'),
    fiscalId: z.string().max(40).optional(),
    publicPageEnabled: z.boolean().default(true),
    // Initial org admin to seed
    admin: z.object({
      email: z.string().email().max(254),
      fullName: z.string().min(2).max(200),
      phone: optionalPhoneSchema,
      locale: z.enum(['ar', 'fr', 'en']).default('ar'),
      // If omitted, a one-time password is generated and returned.
      initialPassword: z
        .string()
        .min(12)
        .max(128)
        .optional(),
    }),
    mainDepartmentName: z.string().min(2).max(100).default('Administration'),
    mainDepartmentRegion: z.string().max(120).optional(),
    mainDepartmentCity: z.string().max(120).optional(),
  })
  .strict();
export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z
  .object({
    legalName: z.string().min(2).max(200).optional(),
    country: z.string().length(2).optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultLanguage: z.enum(['ar', 'fr', 'en']).optional(),
    timezone: z.string().optional(),
    fiscalId: z.string().max(40).nullable().optional(),
    publicPageEnabled: z.boolean().optional(),
  })
  .strict();
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;

export const suspendOrganizationSchema = z
  .object({
    suspended: z.boolean(),
    reason: z
      .string()
      .max(500)
      .optional()
      .transform((s) => (s && s.trim().length > 0 ? s.trim() : undefined)),
  })
  .strict();
export type SuspendOrganizationDto = z.infer<typeof suspendOrganizationSchema>;

export const resetOrgAdminPasswordSchema = z
  .object({
    /** If omitted, a one-time password is generated and returned once. */
    newPassword: z.string().min(12).max(128).optional(),
  })
  .strict();
export type ResetOrgAdminPasswordDto = z.infer<typeof resetOrgAdminPasswordSchema>;

export const updateOrgAdminSchema = z
  .object({
    email: z.string().email().max(254).optional(),
    fullName: z.string().min(2).max(200).optional(),
    phone: nullablePhoneSchema,
    locale: z.enum(['ar', 'fr', 'en']).optional(),
    /** If omitted when only profile fields change, password is left unchanged. */
    newPassword: z.string().min(12).max(128).optional(),
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateOrgAdminDto = z.infer<typeof updateOrgAdminSchema>;
