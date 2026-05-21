import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date');

export const createCampaignSchema = z
  .object({
    name: z.string().min(2).max(160),
    description: z.string().max(2000).optional(),
    occasionId: z.string().uuid().optional(),
    startsAt: dateString,
    /** Omit or null for an open-ended campaign (no fixed end). */
    endsAt: dateString.nullable().optional(),
    targetAmountMinor: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional().default('TND'),
    visibleOnPublicPage: z.boolean().optional().default(true),
    state: z.enum(['draft', 'active', 'closed']).optional().default('draft'),
  })
  .strict()
  .refine((data) => data.endsAt == null || data.startsAt <= data.endsAt, {
    message: 'startsAt must be before or equal to endsAt',
    path: ['endsAt'],
  });
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z
  .object({
    name: z.string().min(2).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    occasionId: z.string().uuid().nullable().optional(),
    startsAt: dateString.optional(),
    endsAt: dateString.nullable().optional(),
    targetAmountMinor: z.number().int().nonnegative().nullable().optional(),
    visibleOnPublicPage: z.boolean().optional(),
    state: z.enum(['draft', 'active', 'closed']).optional(),
  })
  .strict();
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;

export const createOccasionSchema = z
  .object({
    name: z.string().min(2).max(160),
    description: z.string().max(2000).optional(),
    periodStart: dateString,
    periodEnd: dateString,
    recurring: z.boolean().optional().default(false),
    recurringRule: z.string().max(200).optional(),
    isHijriBased: z.boolean().optional().default(false),
  })
  .strict()
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: 'periodStart must be before or equal to periodEnd',
    path: ['periodEnd'],
  });
export type CreateOccasionDto = z.infer<typeof createOccasionSchema>;

export const updateOccasionSchema = z
  .object({
    name: z.string().min(2).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    periodStart: dateString.optional(),
    periodEnd: dateString.optional(),
    recurring: z.boolean().optional(),
    recurringRule: z.string().max(200).nullable().optional(),
    isHijriBased: z.boolean().optional(),
  })
  .strict();
export type UpdateOccasionDto = z.infer<typeof updateOccasionSchema>;
