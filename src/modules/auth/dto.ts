import { z } from 'zod';
import { optionalPhoneSchema } from '../../common/validators/phone';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  organizationSlug: z.string().min(1).max(80).optional(),
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const departmentLoginSchema = z.object({
  organizationSlug: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type DepartmentLoginDto = z.infer<typeof departmentLoginSchema>;

export const registerDonorSchema = z.object({
  organizationSlug: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(200),
  fullName: z.string().min(2).max(200),
  phone: optionalPhoneSchema,
  pseudo: z.string().max(80).optional(),
  acceptsTaxReceipt: z.boolean().optional(),
  fiscalId: z.string().max(80).optional(),
  locale: z.enum(['ar', 'fr', 'en']).default('ar'),
});
export type RegisterDonorDto = z.infer<typeof registerDonorSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(200),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const verify2faSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export type Verify2faDto = z.infer<typeof verify2faSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
  organizationSlug: z.string().min(1).max(80),
});
export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(12).max(200),
});
export type ConfirmPasswordResetDto = z.infer<typeof confirmPasswordResetSchema>;
