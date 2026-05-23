import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(80);
const text = (max = 500) => z.string().trim().max(max);
const timeText = z.string().trim().min(1).max(40);

export const productionExecutionListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: z.string().trim().max(120).optional(),
});

export const productionPlanStatusSchema = z.enum(['draft', 'released', 'pending', 'running', 'completed', 'paused', 'cancelled', 'abnormal_closed']);
export const workOrderStatusSchema = z.enum(['created', 'released', 'running', 'paused', 'completed', 'cancelled']);

export const productionPlanCreateSchema = z.object({
  order_line_id: idSchema.optional(),
  product_id: idSchema,
  material_id: idSchema.optional(),
  planned_quantity: z.number().int().positive(),
  planned_start_at: timeText,
  planned_finish_at: timeText,
  process_id: idSchema.optional(),
  machine_id: idSchema.optional(),
  title: text(160).optional(),
  notes: text(1000).default(''),
  demand_line_ids: z.array(z.string()).optional(),
  project_code: z.string().optional(),
  product_code: z.string().optional(),
  material_code: z.string().optional(),
  plan_period: z.string().optional(),
});

export const productionPlanUpdateSchema = z.object({
  status: productionPlanStatusSchema.optional(),
  planned_start_at: timeText.optional(),
  planned_finish_at: timeText.optional(),
  process_id: idSchema.optional(),
  machine_id: idSchema.optional(),
  notes: text(1000).optional(),
});

export const workOrderUpdateForPlanSchema = z.object({
  status: workOrderStatusSchema.optional(),
  planned_start_date: text(40).optional(),
  planned_finish_date: text(40).optional(),
  notes: text(1000).optional(),
});
