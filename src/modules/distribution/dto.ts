import { z } from 'zod';

export const distributionKindEnum = z.enum(['cash', 'goods', 'mixed']);

const cashLineSchema = z
  .object({
    lineKind: z.literal('cash'),
    amountMinor: z.number().int().positive(),
    currency: z.string().length(3).optional().default('TND'),
    notes: z.string().max(500).optional(),
  })
  .strict();

const itemLineSchema = z
  .object({
    lineKind: z.literal('item'),
    itemId: z.string().uuid(),
    quantity: z.number().positive(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const distributionLineSchema = z.discriminatedUnion('lineKind', [cashLineSchema, itemLineSchema]);
export type DistributionLineInput = z.infer<typeof distributionLineSchema>;

export const createDistributionSchema = z
  .object({
    beneficiaryId: z.string().uuid(),
    kind: distributionKindEnum,
    plannedAt: z.string().datetime().optional(),
    campaignId: z.string().uuid().optional(),
    occasionId: z.string().uuid().optional(),
    notes: z.string().max(2000).optional(),
    /** If true, deliver immediately in the same transaction (no planning step). */
    deliverNow: z.boolean().optional().default(false),
    lines: z.array(distributionLineSchema).min(1).max(50),
  })
  .strict();
export type CreateDistributionDto = z.infer<typeof createDistributionSchema>;

export const deliverDistributionSchema = z
  .object({
    notes: z.string().max(2000).optional(),
    signatureFileId: z.string().uuid().optional(),
  })
  .strict();
export type DeliverDistributionDto = z.infer<typeof deliverDistributionSchema>;

export const cancelDistributionSchema = z
  .object({
    reason: z.string().min(3).max(500),
  })
  .strict();
export type CancelDistributionDto = z.infer<typeof cancelDistributionSchema>;

export const updateDistributionSchema = z
  .object({
    plannedAt: z.string().datetime().optional().nullable(),
    deliveredAt: z.string().datetime().optional().nullable(),
    /** Set status explicitly when toggling delivery. */
    status: z.enum(['planned', 'ready', 'delivered', 'cancelled']).optional(),
    lines: z
      .array(
        z.object({
          id: z.string().uuid(),
          amountMinor: z.number().int().positive().optional(),
          quantity: z.number().positive().optional(),
        }),
      )
      .optional(),
  })
  .strict();
export type UpdateDistributionDto = z.infer<typeof updateDistributionSchema>;

export const listDistributionsQuerySchema = z
  .object({
    status: z.enum(['planned', 'ready', 'delivered', 'cancelled']).optional(),
    beneficiaryId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(200).optional().default(50),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
  })
  .strict();
export type ListDistributionsQuery = z.infer<typeof listDistributionsQuerySchema>;
