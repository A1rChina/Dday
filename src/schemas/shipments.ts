import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(80);
const text = (max = 500) => z.string().trim().max(max);

export const shipmentListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: text(120).optional(),
});

export const shipmentCreateSchema = z.object({
  order_item_id: idSchema,
  quantity: z.number().int().positive(),
  warehouse_code: text(40).default('MAIN'),
  location_code: text(80).default(''),
  batch_no: text(80).optional(),
  shipped_at: text(40).optional(),
  confirmed_by: text(120).default(''),
  notes: text(1000).default(''),
});
