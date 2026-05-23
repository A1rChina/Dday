import { z } from 'zod';

export const orderFlowListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: z.string().trim().max(120).optional(),
});

const idSchema = z.string().trim().min(1).max(80);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = (max = 500) => z.string().trim().max(max);

export const orderImportItemSchema = z.object({
  product_id: idSchema.optional(),
  product_code: text(80).default(''),
  product_name: text(160).default(''),
  material_id: idSchema.optional(),
  quantity: z.number().int().positive(),
  due_date: dateSchema.optional(),
  notes: text(1000).default(''),
});

export const orderImportSchema = z.object({
  order_code: text(80).optional(),
  customer_code: text(80).default(''),
  customer_name: text(160).default(''),
  source_type: text(80).default('manual'),
  source_file_name: text(260).default(''),
  requested_date: dateSchema.optional(),
  change_summary: text(1000).default('initial import'),
  notes: text(1000).default(''),
  items: z.array(orderImportItemSchema).min(1).max(200),
});

export const orderUpdateSchema = z.object({
  customer_name: text(160).optional(),
  requested_date: dateSchema.optional(),
  notes: text(1000).optional(),
  items: z.array(orderImportItemSchema).optional(),
});

export const receiptCreateSchema = z.object({
  material_id: idSchema,
  demand_line_id: idSchema.optional(),
  supplier_name: text(160).default(''),
  warehouse_code: text(40).default('MAIN'),
  batch_no: text(80).default(''),
  quantity: z.number().int().positive(),
  notes: text(1000).default(''),
});

export const productionPlanCreateSchema = z.object({
  title: text(160).min(1),
  plan_date: dateSchema,
  order_id: idSchema.optional(),
  items: z
    .array(
      z.object({
        demand_line_id: idSchema.optional(),
        product_id: idSchema,
        material_id: idSchema.optional(),
        planned_quantity: z.number().int().positive(),
        machine_id: idSchema.optional(),
        planned_start_date: dateSchema.optional(),
        planned_finish_date: dateSchema.optional(),
        notes: text(1000).default(''),
      })
    )
    .min(1)
    .max(100),
});

export const deliveryPlanCreateSchema = z.object({
  order_id: idSchema.optional(),
  planned_ship_date: dateSchema,
  items: z
    .array(
      z.object({
        demand_line_id: idSchema.optional(),
        product_id: idSchema,
        quantity: z.number().int().positive(),
        batch_no: text(80).default(''),
      })
    )
    .min(1)
    .max(100),
});

export const qualityIssueCreateSchema = z.object({
  source_type: z.enum(['incoming', 'production', 'customer', 'warehouse']).default('warehouse'),
  source_id: text(80).default(''),
  demand_id: idSchema.optional(),
  demand_line_id: idSchema.optional(),
  work_order_id: idSchema.optional(),
  material_id: idSchema.optional(),
  product_id: idSchema.optional(),
  warehouse_code: text(40).default('MAIN'),
  location_code: text(80).default(''),
  batch_no: text(80).default(''),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: text(160).min(1),
  description: text(1500).default(''),
  quantity: z.number().int().min(0).default(0),
  freeze_qty: z.number().int().min(0).default(0),
});

export const qualityIssueUpdateSchema = z.object({
  status: z.enum(['open', 'confirmed', 'processing', 'frozen', 'resolved', 'closed']).optional(),
  handling_method: z
    .enum(['use_as_is', 'adjust_machine', 'sort_use', 'rework', 'scrap', 'return_replace', 'wait_customer', 'wait_supplier'])
    .optional(),
  description: text(1500).optional(),
  owner: text(120).optional(),
});

export const qualityIssueActionSchema = z.object({
  quantity: z.number().int().positive().optional(),
  handling_method: z
    .enum(['use_as_is', 'adjust_machine', 'sort_use', 'rework', 'scrap', 'return_replace', 'wait_customer', 'wait_supplier'])
    .optional(),
  notes: text(1000).default(''),
  actor: text(120).default(''),
});
