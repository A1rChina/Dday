import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(80);
const text = (max = 500) => z.string().trim().max(max);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const importOrderItemSchema = z.object({
  product_id: idSchema.optional(),
  product_code: text(80).default(''),
  product_name: text(160).default(''),
  material_id: idSchema.optional(),
  quantity: z.number().int().positive(),
  due_date: dateSchema.optional(),
  notes: text(1000).default(''),
});

export const importOrderSchema = z.object({
  order_code: text(80).optional(),
  customer_code: text(80).default(''),
  customer_name: text(160).default(''),
  source_type: text(80).default('manual'),
  source_file_name: text(260).default(''),
  requested_date: dateSchema.optional(),
  imported_by: text(120).default(''),
  change_summary: text(1000).default('initial import'),
  notes: text(1000).default(''),
  items: z.array(importOrderItemSchema).min(1).max(200),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['imported', 'confirmed', 'planned', 'in_production', 'ready_to_ship', 'shipped', 'closed', 'cancelled']),
  notes: text(1000).optional(),
});

export const receiveMaterialSchema = z.object({
  material_id: idSchema,
  order_item_id: idSchema.optional(),
  supplier_name: text(160).default(''),
  warehouse_code: text(40).default('MAIN'),
  batch_no: text(80).default(''),
  quantity: z.number().int().positive(),
  received_by: text(120).default(''),
  notes: text(1000).default(''),
});

export const createProductionPlanItemSchema = z.object({
  order_item_id: idSchema.optional(),
  product_id: idSchema,
  material_id: idSchema.optional(),
  planned_quantity: z.number().int().positive(),
  machine_id: idSchema.optional(),
  planned_start_date: dateSchema.optional(),
  planned_finish_date: dateSchema.optional(),
  notes: text(1000).default(''),
});

export const createProductionPlanSchema = z.object({
  title: text(160).min(1),
  plan_date: dateSchema,
  created_by: text(120).default(''),
  items: z.array(createProductionPlanItemSchema).min(1).max(100),
});

export const createDeliveryPlanItemSchema = z.object({
  order_item_id: idSchema.optional(),
  product_id: idSchema,
  quantity: z.number().int().positive(),
  batch_no: text(80).default(''),
});

export const createDeliveryPlanSchema = z.object({
  order_id: idSchema.optional(),
  planned_ship_date: dateSchema,
  created_by: text(120).default(''),
  items: z.array(createDeliveryPlanItemSchema).min(1).max(100),
});

export const confirmShipmentSchema = z.object({
  confirmed_by: text(120).default(''),
  notes: text(1000).default(''),
});

export const createQualityIssueSchema = z.object({
  source_type: text(80).default('manual'),
  source_id: text(80).default(''),
  order_id: idSchema.optional(),
  order_item_id: idSchema.optional(),
  work_order_id: idSchema.optional(),
  material_id: idSchema.optional(),
  product_id: idSchema.optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: text(160).min(1),
  description: text(1500).default(''),
  quantity: z.number().int().min(0).default(0),
  owner: text(120).default(''),
  freeze: z
    .object({
      warehouse_code: text(40).default('MAIN'),
      batch_no: text(80).default(''),
      freeze_qty: z.number().int().positive(),
      notes: text(1000).default(''),
    })
    .optional(),
});

export const issueActionSchema = z.object({
  action: z.enum(['confirm', 'process', 'resolve', 'close', 'note']),
  message: text(1000).default(''),
  actor: text(120).default(''),
});
