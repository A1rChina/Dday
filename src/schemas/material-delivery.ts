import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(80);
const text = (max = 500) => z.string().trim().max(max);
const timeText = z.string().trim().min(1).max(40);

export const materialDeliveryStatusSchema = z.enum(['pending', 'shipped', 'arrived', 'delayed', 'abnormal', 'closed']);

export const materialDeliveryListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: z.string().trim().max(120).optional(),
});

export const materialDeliveryPlanCreateSchema = z.object({
  material_id: idSchema,
  material_name: text(160).default(''),
  supplier_name: text(160).default(''),
  quantity: z.number().int().positive(),
  planned_ship_at: timeText,
  estimated_arrival_at: timeText,
  logistics_tracking_no: text(120).default(''),
  vehicle_info: text(160).default(''),
  delay_reason: text(500).default(''),
  status: materialDeliveryStatusSchema.default('pending'),
  notes: text(1000).default(''),
});

export const materialDeliveryPlanUpdateSchema = z.object({
  material_id: idSchema.optional(),
  material_name: text(160).optional(),
  supplier_name: text(160).optional(),
  quantity: z.number().int().positive().optional(),
  planned_ship_at: timeText.optional(),
  estimated_arrival_at: timeText.optional(),
  actual_arrival_at: text(40).optional(),
  logistics_tracking_no: text(120).optional(),
  vehicle_info: text(160).optional(),
  delay_reason: text(500).optional(),
  status: materialDeliveryStatusSchema.optional(),
  notes: text(1000).optional(),
});

export const warehouseReceiptCreateSchema = z.object({
  material_delivery_plan_id: idSchema,
  warehouse_code: text(40).default('MAIN'),
  location_code: text(80).default(''),
  batch_no: text(80).default(''),
  quantity: z.number().int().positive().optional(),
  received_at: timeText.optional(),
  received_by: text(120).default(''),
  status: z.enum(['received', 'closed']).default('received'),
  notes: text(1000).default(''),
});
