import { z } from 'zod';

const optionalText = (max = 500) => z.string().trim().max(max).optional();
const idSchema = z.string().trim().min(1).max(80);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createMaterialSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  type: z.enum(['raw', 'semi_finished', 'finished', 'abnormal']).default('raw'),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  spec: optionalText(300).default(''),
  notes: optionalText(1000).default(''),
});

export const updateMaterialSchema = createMaterialSchema
  .partial()
  .extend({ is_active: z.number().int().min(0).max(1).optional() });

export const createProductSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  customer_name: optionalText(160).default(''),
  project_name: optionalText(160).default(''),
  material_id: idSchema.optional(),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  process_ids: z.array(idSchema).max(20).default([]),
  notes: optionalText(1000).default(''),
});

export const updateProductSchema = createProductSchema
  .partial()
  .extend({ is_active: z.number().int().min(0).max(1).optional() });

export const createProcessSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  sort_order: z.number().int().min(0).max(9999).default(100),
  notes: optionalText(1000).default(''),
});

export const updateProcessSchema = createProcessSchema
  .partial()
  .extend({ is_active: z.number().int().min(0).max(1).optional() });

export const createMachineSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  process_id: idSchema.optional(),
  status: z.enum(['available', 'busy', 'maintenance', 'disabled']).default('available'),
  notes: optionalText(1000).default(''),
});

export const updateMachineSchema = createMachineSchema
  .partial()
  .extend({ is_active: z.number().int().min(0).max(1).optional() });

export const createWorkOrderSchema = z.object({
  code: z.string().trim().min(1).max(80).optional(),
  product_id: idSchema,
  material_id: idSchema.optional(),
  planned_quantity: z.number().int().positive(),
  planned_start_date: dateSchema.optional(),
  planned_finish_date: dateSchema.optional(),
  step_process_ids: z.array(idSchema).max(20).optional(),
  notes: optionalText(1000).default(''),
});

export const updateWorkOrderSchema = z.object({
  status: z
    .enum(['created', 'printed', 'released', 'running', 'paused', 'completed', 'closed', 'cancelled'])
    .optional(),
  planned_quantity: z.number().int().positive().optional(),
  planned_start_date: dateSchema.optional(),
  planned_finish_date: dateSchema.optional(),
  notes: optionalText(1000),
});

export const createReportSchema = z.object({
  work_order_id: idSchema.optional(),
  work_order_code: z.string().trim().min(1).max(80).optional(),
  step_id: idSchema.optional(),
  process_id: idSchema.optional(),
  machine_id: idSchema.optional(),
  operator_name: optionalText(120).default(''),
  report_qty: z.number().int().min(0).optional(),
  good_qty: z.number().int().min(0).default(0),
  defect_qty: z.number().int().min(0).default(0),
  scrap_qty: z.number().int().min(0).default(0),
  started_at: z.string().trim().max(80).optional(),
  ended_at: z.string().trim().max(80).optional(),
  notes: optionalText(1000).default(''),
});

export const scanWorkOrderSchema = z.object({
  code: z.string().trim().min(1).max(200),
});

export const inventoryAdjustSchema = z.object({
  material_id: idSchema.optional(),
  product_id: idSchema.optional(),
  warehouse_code: z.string().trim().min(1).max(40).default('MAIN'),
  batch_no: z.string().trim().max(80).default(''),
  qty_delta: z.number().int(),
  reason: optionalText(500).default('manual adjust'),
  created_by: optionalText(120).default(''),
});

export const createFreezeSchema = z.object({
  source_type: z.string().trim().min(1).max(80).default('manual'),
  project_name: optionalText(160).default(''),
  product_id: idSchema.optional(),
  material_id: idSchema.optional(),
  warehouse_code: z.string().trim().min(1).max(40).default('MAIN'),
  batch_no: z.string().trim().max(80).default(''),
  abnormal_qty: z.number().int().min(0).default(0),
  freeze_qty: z.number().int().positive(),
  selectable_qty: z.number().int().min(0).default(0),
  rework_qty: z.number().int().min(0).default(0),
  return_qty: z.number().int().min(0).default(0),
  scrap_qty: z.number().int().min(0).default(0),
  responsibility: optionalText(160).default(''),
  solution: optionalText(500).default(''),
  eta: optionalText(80).default(''),
  impact_order: optionalText(160).default(''),
  impact_delivery: optionalText(500).default(''),
  owner: optionalText(120).default(''),
  notes: optionalText(1000).default(''),
  is_addition: z.boolean().default(false).optional(),
});

export const updateFreezeSchema = createFreezeSchema.partial().extend({
  status: z.enum(['open', 'confirmed', 'processing', 'released', 'scrapped', 'returned', 'closed']).optional(),
});

export const closeFreezeSchema = z.object({
  action: z.enum(['release', 'scrap', 'return', 'close']).default('release'),
  notes: optionalText(1000).default(''),
  actor: optionalText(120).default(''),
});
