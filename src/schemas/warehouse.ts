import { z } from 'zod';

export const warehouseListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  q: z.string().trim().max(120).optional(),
});

export const warehouseSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().default('normal'),
  status: z.string().trim().default('active'),
  remark: z.string().trim().default(''),
});

export const locationSchema = z.object({
  warehouseCode: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  status: z.string().trim().default('active'),
  remark: z.string().trim().default(''),
});

export const receiptItemSchema = z.object({
  itemId: z.string().trim().min(1),
  itemCode: z.string().trim().default(''),
  itemName: z.string().trim().default(''),
  itemType: z.string().trim().default(''),
  projectId: z.string().trim().nullable().optional(),
  projectCode: z.string().trim().default(''),
  customerId: z.string().trim().nullable().optional(),
  customerName: z.string().trim().default(''),
  batchNo: z.string().trim().default(''),
  quantity: z.number().int().positive(),
  warehouseId: z.string().trim().min(1),
  warehouseName: z.string().trim().default(''),
  locationId: z.string().trim().nullable().optional(),
  locationCode: z.string().trim().default(''),
});

export const createReceiptSchema = z.object({
  sourceType: z.string().trim().default('manual'),
  receivedDate: z.string().trim().min(1),
  notes: z.string().trim().default(''),
  actor: z.string().trim().min(1),
  items: z.array(receiptItemSchema).min(1),
});

export const createIssueSchema = z.object({
  sourceType: z.string().trim().default('manual'),
  issuedDate: z.string().trim().min(1),
  notes: z.string().trim().default(''),
  actor: z.string().trim().min(1),
  items: z.array(receiptItemSchema).min(1), // reuse receiptItemSchema structure for simplicity
});

export const stocktakeItemSchema = z.object({
  itemId: z.string().trim().min(1),
  projectId: z.string().trim().nullable().optional(),
  batchNo: z.string().trim().default(''),
  systemQty: z.number().int(),
  actualQty: z.number().int(),
  locationId: z.string().trim().nullable().optional(),
});

export const createStocktakeSchema = z.object({
  warehouseId: z.string().trim().min(1),
  stocktakeDate: z.string().trim().min(1),
  notes: z.string().trim().default(''),
  actor: z.string().trim().min(1),
  items: z.array(stocktakeItemSchema).min(1),
});
