import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import { materialDeliveryListQuerySchema, warehouseReceiptCreateSchema } from '../schemas/material-delivery';
import { MaterialDeliveryService } from '../services/material-delivery.service';
import { fail, ok } from '../utils/http';

export const warehouseReceiptRoutes = new Hono<AppEnv>();

warehouseReceiptRoutes.get('/', zValidator('query', materialDeliveryListQuerySchema), async (c) => {
  const service = new MaterialDeliveryService(c.env.DB);
  return ok(c, await service.listReceipts(c.req.valid('query')));
});

warehouseReceiptRoutes.post('/', zValidator('json', warehouseReceiptCreateSchema), async (c) => {
  try {
    const service = new MaterialDeliveryService(c.env.DB);
    return ok(c, await service.createReceipt(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create warehouse receipt');
  }
});

warehouseReceiptRoutes.get('/:id', async (c) => {
  const service = new MaterialDeliveryService(c.env.DB);
  const receipt = await service.getReceipt(c.req.param('id'));
  if (!receipt) return fail(c, 'warehouse receipt not found', 404);
  return ok(c, receipt);
});
