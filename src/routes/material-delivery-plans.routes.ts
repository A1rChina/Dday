import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import {
  materialDeliveryListQuerySchema,
  materialDeliveryPlanCreateSchema,
  materialDeliveryPlanUpdateSchema,
  warehouseReceiptCreateSchema,
} from '../schemas/material-delivery';
import { MaterialDeliveryService } from '../services/material-delivery.service';
import { fail, ok } from '../utils/http';

export const materialDeliveryPlanRoutes = new Hono<AppEnv>();

materialDeliveryPlanRoutes.get('/', zValidator('query', materialDeliveryListQuerySchema), async (c) => {
  const service = new MaterialDeliveryService(c.env.DB);
  return ok(c, await service.listPlans(c.req.valid('query')));
});

materialDeliveryPlanRoutes.post('/', zValidator('json', materialDeliveryPlanCreateSchema), async (c) => {
  try {
    const service = new MaterialDeliveryService(c.env.DB);
    return ok(c, await service.createPlan(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create material delivery plan');
  }
});

materialDeliveryPlanRoutes.get('/:id', async (c) => {
  const service = new MaterialDeliveryService(c.env.DB);
  const plan = await service.getPlan(c.req.param('id'));
  if (!plan) return fail(c, 'material delivery plan not found', 404);
  return ok(c, plan);
});

materialDeliveryPlanRoutes.patch('/:id', zValidator('json', materialDeliveryPlanUpdateSchema), async (c) => {
  try {
    const service = new MaterialDeliveryService(c.env.DB);
    const plan = await service.updatePlan(c.req.param('id'), c.req.valid('json'));
    if (!plan) return fail(c, 'material delivery plan not found', 404);
    return ok(c, plan);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update material delivery plan');
  }
});

materialDeliveryPlanRoutes.post('/:id/receive', zValidator('json', warehouseReceiptCreateSchema.omit({ material_delivery_plan_id: true })), async (c) => {
  try {
    const service = new MaterialDeliveryService(c.env.DB);
    return ok(c, await service.receivePlan(c.req.param('id'), c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create warehouse receipt');
  }
});
