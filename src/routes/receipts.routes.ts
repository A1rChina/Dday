import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import { receiptCreateSchema } from '../schemas/order-flow';
import { OrderFlowService } from '../services/order-flow.service';
import { fail, ok } from '../utils/http';
import { orderFlowListQuerySchema } from '../schemas/order-flow';

export const receiptRoutes = new Hono<AppEnv>();

receiptRoutes.get('/', zValidator('query', orderFlowListQuerySchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.listReceipts(c.req.valid('query')));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to list receipts');
  }
});

receiptRoutes.post('/', zValidator('json', receiptCreateSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.receiveMaterial(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to receive material');
  }
});

receiptRoutes.post('/:id/confirm', async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.confirmMaterialReceipt(c.req.param('id'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to confirm receipt');
  }
});
