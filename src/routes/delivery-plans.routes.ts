import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import { deliveryPlanCreateSchema, orderFlowListQuerySchema } from '../schemas/order-flow';
import { OrderFlowService } from '../services/order-flow.service';
import { fail, ok } from '../utils/http';

export const deliveryPlanRoutes = new Hono<AppEnv>();

deliveryPlanRoutes.get('/', zValidator('query', orderFlowListQuerySchema), async (c) => {
  const service = new OrderFlowService(c.env.DB);
  return ok(c, await service.listDeliveryPlans(c.req.valid('query')));
});

deliveryPlanRoutes.post('/', zValidator('json', deliveryPlanCreateSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.createDeliveryPlan(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create delivery plan');
  }
});

deliveryPlanRoutes.get('/:id', async (c) => {
  const service = new OrderFlowService(c.env.DB);
  const plan = await service.getDeliveryPlan(c.req.param('id'));
  if (!plan) return fail(c, 'delivery plan not found', 404);
  return ok(c, plan);
});

deliveryPlanRoutes.post('/:id/confirm', async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.confirmShipment(c.req.param('id'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to confirm shipment');
  }
});
