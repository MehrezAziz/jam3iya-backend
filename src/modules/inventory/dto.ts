import { z } from 'zod';

/**
 * Common suggested labels — the backend accepts any free-text category so
 * each organization can define its own taxonomy.
 */
export const SUGGESTED_CATEGORIES = [
  'food',
  'medicine',
  'clothing',
  'school_supplies',
  'hygiene',
  'blankets',
  'furniture',
  'other',
] as const;

const categorySchema = z
  .string()
  .min(2, 'category must be at least 2 characters')
  .max(80, 'category must be at most 80 characters')
  .transform((s) => s.trim().toLowerCase().replace(/\s+/g, '_'));

export const createItemSchema = z
  .object({
    name: z.string().min(2).max(160),
    category: categorySchema,
    unit: z.string().min(1).max(40),
    defaultQuantity: z.number().positive().optional(),
    trackExpiry: z.boolean().optional().default(false),
    minStock: z.number().nonnegative().optional(),
    /** Opening quantity — creates an initial stock lot when > 0. */
    initialStock: z.number().nonnegative().optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();
export type CreateItemDto = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial().strict();
export type UpdateItemDto = z.infer<typeof updateItemSchema>;

export const listItemsQuerySchema = z
  .object({
    q: z.string().max(80).optional(),
    category: categorySchema.optional(),
    limit: z.coerce.number().int().positive().max(200).optional().default(50),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
  })
  .strict();
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export const createLotSchema = z
  .object({
    itemId: z.string().uuid(),
    quantity: z.number().positive(),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    supplierName: z.string().max(200).optional(),
    supplierInvoiceRef: z.string().max(80).optional(),
    unitCostMinor: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional().default('TND'),
    storageLocation: z.string().max(120).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();
export type CreateLotDto = z.infer<typeof createLotSchema>;

export const updateLotSchema = z
  .object({
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    supplierName: z.string().max(200).nullable().optional(),
    supplierInvoiceRef: z.string().max(80).nullable().optional(),
    unitCostMinor: z.number().int().nonnegative().nullable().optional(),
    storageLocation: z.string().max(120).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();
export type UpdateLotDto = z.infer<typeof updateLotSchema>;

export const setItemStockSchema = z
  .object({
    quantity: z.number().nonnegative(),
    reason: z.string().min(3).max(400).optional(),
  })
  .strict();
export type SetItemStockDto = z.infer<typeof setItemStockSchema>;

export const adjustLotSchema = z
  .object({
    delta: z.number(),
    reason: z.string().min(3).max(400),
    type: z
      .enum(['adjustment', 'expired_writeoff', 'damaged_writeoff'])
      .optional()
      .default('adjustment'),
  })
  .strict();
export type AdjustLotDto = z.infer<typeof adjustLotSchema>;
