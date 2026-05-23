import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(80);
const text = (max = 500) => z.string().trim().max(max);

export const reportingListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: text(160).optional(),
  work_order_id: text(80).optional(),
  product: text(160).optional(),
  operation: text(160).optional(),
  operator: text(120).optional(),
  status: text(40).optional(),
  abnormal: z.coerce.boolean().optional(),
  date_from: text(40).optional(),
  date_to: text(40).optional(),
});

export const generateProcessCardsSchema = z.object({
  work_order_id: idSchema,
  quantities: z.array(z.coerce.number().int().positive()).min(1).max(100),
  drawing_no: text(120).default(''),
  created_by: text(120).default(''),
  remarks: text(1000).default(''),
  process_hint: text(1000).default(''),
  special_remarks: text(1000).default(''),
});

export const scanProcessCardSchema = z.object({
  code: text(200).min(1),
});

export const operationReportSchema = z.object({
  card_id: idSchema.optional(),
  card_code: text(120).optional(),
  operation_id: idSchema.optional(),
  report_type: z.enum(['scan', 'manual']).default('scan'),
  good_qty: z.coerce.number().int().min(0).default(0),
  defect_qty: z.coerce.number().int().min(0).default(0),
  scrap_qty: z.coerce.number().int().min(0).default(0),
  rework_qty: z.coerce.number().int().min(0).default(0),
  operator: text(120).default(''),
  inspector: text(120).default(''),
  machine_id: text(120).default(''),
  defect_reason: text(500).default(''),
  manual_reason: text(500).default(''),
  remark: text(1000).default(''),
});

export const voidProcessCardSchema = z.object({
  reason: text(500).default(''),
  actor: text(120).default(''),
});

export const handleAbnormalSchema = z.object({
  handling_method: z.enum(['continue', 'rework', 'scrap', 'return_replace', 'wait_confirm']),
  handled_by: text(120).default(''),
  remark: text(1000).default(''),
});
