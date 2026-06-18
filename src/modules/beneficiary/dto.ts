import { z } from 'zod';
import { optionalCinSchema, requiredCinSchema } from '../../common/validators/cin';
import { optionalPhoneSchema } from '../../common/validators/phone';
import { beneficiaryLookupFieldSchema } from '../campaign/dto';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createBeneficiarySchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  gender: z.enum(['male', 'female']),
  dateOfBirth: dateString.optional(),
  maritalStatus: z
    .enum(['single', 'married', 'divorced', 'widowed', 'separated'])
    .default('single'),
  cin: optionalCinSchema,
  phone: optionalPhoneSchema,
  address: z.string().max(500).optional(),
  region: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  publicAlias: z.string().max(120).optional(),
  departmentId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
  isOrphan: z.boolean().optional().default(false),
});
export type CreateBeneficiaryDto = z.infer<typeof createBeneficiarySchema>;

export const updateBeneficiarySchema = createBeneficiarySchema
  .partial()
  .omit({ departmentId: true })
  .extend({
    hasCnss: z.boolean().optional(),
    hasCnam: z.boolean().optional(),
    hasYellowNotebook: z.boolean().optional(),
    hasWhiteNotebook: z.boolean().optional(),
    hasMonthlyGrant: z.boolean().optional(),
    photoConsent: z.boolean().optional(),
    isOrphan: z.boolean().optional(),
  });
export type UpdateBeneficiaryDto = z.infer<typeof updateBeneficiarySchema>;

export const listBeneficiariesQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z
    .enum(['draft', 'pending_review', 'active', 'on_hold', 'archived'])
    .optional(),
  region: z.string().max(120).optional(),
  departmentId: z.string().uuid().optional(),
  isOrphan: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  /** Restrict search to specific beneficiary fields (name, phone, cin, code). */
  fields: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
      z.array(beneficiaryLookupFieldSchema).optional(),
    )
    .optional(),
});
export type ListBeneficiariesQuery = z.infer<typeof listBeneficiariesQuerySchema>;

export const donationPickSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
  fields: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
      z.array(beneficiaryLookupFieldSchema).min(1),
    ),
  /** When set, results include whether each beneficiary is on the campaign list. Search is org-wide. */
  campaignId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(20).optional().default(10),
});
export type DonationPickSearchQuery = z.infer<typeof donationPickSearchQuerySchema>;

// ----- sub-resources --------------------------------------------------------

export const upsertSpouseSchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  gender: z.enum(['male', 'female']),
  dateOfBirth: dateString.optional(),
  cin: requiredCinSchema,
  phone: optionalPhoneSchema,
  hasJob: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional(),
});
export type UpsertSpouseDto = z.infer<typeof upsertSpouseSchema>;

export const upsertChildSchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  gender: z.enum(['male', 'female']),
  dateOfBirth: dateString,
  inSchool: z.boolean().optional().default(false),
  schoolLevel: z
    .enum(['none', 'primary', 'preparatory', 'secondary', 'university'])
    .optional()
    .default('none'),
  schoolLevelUpdatedAt: dateString.optional(),
  schoolName: z.string().max(200).optional(),
  works: z.boolean().optional().default(false),
  jobDescription: z.string().max(500).optional(),
  hasDisability: z.boolean().optional().default(false),
  disabilityNotes: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpsertChildDto = z.infer<typeof upsertChildSchema>;

export const upsertDependentSchema = z.object({
  relationType: z.enum(['mother', 'father', 'orphan', 'sibling', 'grandparent', 'uncle_aunt', 'other']),
  relationOther: z.string().max(120).optional(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  gender: z.enum(['male', 'female']),
  dateOfBirth: dateString.optional(),
  cin: optionalCinSchema,
  phone: optionalPhoneSchema,
  notes: z.string().max(2000).optional(),
});
export type UpsertDependentDto = z.infer<typeof upsertDependentSchema>;

export const upsertSocialCoverageSchema = z.object({
  type: z.enum([
    'cnss',
    'cnam',
    'yellow_notebook',
    'white_notebook',
    'monthly_grant',
    'none',
    'other',
  ]),
  identifier: z.string().max(120).optional(),
  /** Monthly amount in major units (TND). */
  monthlyAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional().default('TND'),
  validFrom: dateString.optional(),
  validUntil: dateString.optional(),
  notes: z.string().max(2000).optional(),
});
export type UpsertSocialCoverageDto = z.infer<typeof upsertSocialCoverageSchema>;

export const upsertJobSchema = z
  .object({
    subjectType: z.enum(['beneficiary', 'spouse']),
    title: z.string().min(1).max(200),
    employer: z.string().max(200).optional(),
    place: z.string().max(200).optional(),
    schedule: z.string().max(200).optional(),
    /** Salary in major units (TND), converted server-side. */
    salary: z.number().nonnegative().optional(),
    isRegistered: z.boolean().optional().default(false),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type UpsertJobDto = z.infer<typeof upsertJobSchema>;

export const upsertHousingSchema = z
  .object({
    tenure: z.enum(['owned', 'rented', 'hosted', 'homeless', 'other']),
    /** Rent in major units (TND), converted server-side. */
    rent: z.number().nonnegative().optional(),
    ownerName: z.string().max(200).optional(),
    ownerPhone: optionalPhoneSchema,
    condition: z.enum(['good', 'fair', 'poor', 'unsafe']).optional().default('fair'),
    rooms: z.number().int().nonnegative().optional(),
    occupants: z.number().int().nonnegative().optional(),
    hasElectricity: z.boolean().optional().default(true),
    hasRunningWater: z.boolean().optional().default(true),
    address: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type UpsertHousingDto = z.infer<typeof upsertHousingSchema>;

export const upsertDiseaseSchema = z
  .object({
    subjectType: z.enum(['beneficiary', 'spouse', 'child', 'dependent']).optional().default('beneficiary'),
    childId: z.string().uuid().optional(),
    dependentPersonId: z.string().uuid().optional(),
    name: z.string().max(200).optional(),
    nameFree: z.string().max(500).optional(),
    diagnosisDate: dateString.optional(),
    /** Monthly cost in major units (TND), converted server-side. */
    monthlyCost: z.number().nonnegative().optional(),
    status: z.enum(['active', 'controlled', 'recovered']).optional().default('active'),
    needsMedication: z.boolean().optional().default(false),
    needsMonitoring: z.boolean().optional().default(false),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type UpsertDiseaseDto = z.infer<typeof upsertDiseaseSchema>;
