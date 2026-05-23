import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(80);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: z.string().trim().max(120).optional(),
  customer_name: z.string().trim().max(160).optional(),
  project_name: z.string().trim().max(160).optional(),
});

export const productCreateSchema = z.object({
  code: z.string().trim().min(1, 'part number is required').max(80),
  name: z.string().trim().min(1, 'part name is required').max(160),
  customer_id: idSchema.optional(),
  customer_name: z.string().trim().max(160).default(''),
  project_id: idSchema.optional(),
  project_name: z.string().trim().max(160).default(''),
  project_code: z.string().trim().max(160).default(''),
  supplier_id: idSchema.optional(),
  supplier_name: z.string().trim().max(160).default(''),
  factory_id: idSchema.optional(),
  unit: z.string().trim().min(1).max(20).default('PCS'),
  profile_material_code: z.string().trim().max(120).optional(),
  profile_material_name: z.string().trim().max(160).optional(),
  unit_usage: z.coerce.number().int().min(0).default(1),
  safety_stock: z.coerce.number().int().min(0).default(0),
  warning_stock: z.coerce.number().int().min(0).default(0),
  material_id: idSchema.optional(),
  process_ids: z.array(idSchema).max(20).default([]),
  notes: z.string().trim().max(1000).default(''),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional(),
});

export const workOrderCreateSchema = z.object({
  code: z.string().trim().min(1).max(80).optional(),
  product_id: idSchema,
  material_id: idSchema.optional(),
  planned_quantity: z.number().int().positive(),
  planned_start_date: dateSchema.optional(),
  planned_finish_date: dateSchema.optional(),
  notes: z.string().trim().max(1000).default(''),
});

export const workOrderUpdateSchema = z.object({
  status: z.enum(['created', 'printed', 'released', 'running', 'paused', 'completed', 'closed', 'cancelled']).optional(),
  planned_quantity: z.number().int().positive().optional(),
  planned_start_date: dateSchema.optional(),
  planned_finish_date: dateSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const pdaReportSchema = z.object({
  work_order_id: idSchema.optional(),
  work_order_code: z.string().trim().min(1).max(120).optional(),
  report_qty: z.number().int().min(0).optional(),
  good_qty: z.number().int().min(0).default(0),
  defect_qty: z.number().int().min(0).default(0),
  scrap_qty: z.number().int().min(0).default(0),
});

export const customerCreateSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  short_name: z.string().trim().max(80).default(''),
  contact_person: z.string().trim().max(80).default(''),
  contact_phone: z.string().trim().max(80).default(''),
  delivery_address: z.string().trim().max(300).default(''),
  contact: z.string().trim().max(160).default(''),
  notes: z.string().trim().max(1000).default(''),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional(),
});

export const supplierCreateSchema = z.object({
  supplier_id: z.string().trim().min(1).max(80).optional(),
  supplier_name: z.string().trim().min(1).max(160),
  supplier_short_name: z.string().trim().max(80).default(''),
  contact_person: z.string().trim().max(80).default(''),
  contact_phone: z.string().trim().max(80).default(''),
  address: z.string().trim().max(300).default(''),
  default_lead_time: z.coerce.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  remark: z.string().trim().max(1000).default(''),
});

export const supplierUpdateSchema = supplierCreateSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional(),
});

export const projectCreateSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  customer_id: idSchema.optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  remark: z.string().trim().max(1000).default(''),
  notes: z.string().trim().max(1000).default(''),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional(),
});
