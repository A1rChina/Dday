import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import { fail, ok } from '../utils/http';
import { orderFlowListQuerySchema, orderImportSchema, orderUpdateSchema } from '../schemas/order-flow';
import { OrderFlowService } from '../services/order-flow.service';
import { ShipmentService } from '../services/shipment.service';

export const orderRoutes = new Hono<AppEnv>();

orderRoutes.get('/', zValidator('query', orderFlowListQuerySchema), async (c) => {
  const service = new OrderFlowService(c.env.DB);
  return ok(c, await service.listOrders(c.req.valid('query')));
});

orderRoutes.post('/', zValidator('json', orderImportSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.importOrder(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to import order');
  }
});

orderRoutes.post('/import', zValidator('json', orderImportSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.importOrder(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to import order');
  }
});

orderRoutes.get('/:id', async (c) => {
  const service = new OrderFlowService(c.env.DB);
  const order = await service.getOrder(c.req.param('id'));
  if (!order) return fail(c, 'order not found', 404);
  return ok(c, order);
});

orderRoutes.patch('/:id', zValidator('json', orderUpdateSchema), async (c) => {
  const service = new OrderFlowService(c.env.DB);
  const order = await service.updateOrder(c.req.param('id'), c.req.valid('json'), requestActor(c));
  if (!order) return fail(c, 'order not found', 404);
  return ok(c, order);
});

orderRoutes.post('/:id/confirm', async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    const order = await service.confirmOrder(c.req.param('id'), requestActor(c));
    if (!order) return fail(c, 'order not found', 404);
    return ok(c, order);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to confirm order');
  }
});

orderRoutes.delete('/:id', async (c) => {
  const service = new OrderFlowService(c.env.DB);
  const order = await service.deleteOrder(c.req.param('id'), requestActor(c));
  if (!order) return fail(c, 'order not found', 404);
  return ok(c, order);
});

orderRoutes.post('/:id/push/plan', async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.pushOrderToPlan(c.req.param('id'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to push order to plan');
  }
});

orderRoutes.post('/:id/push-to-plan', async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.pushOrderToPlan(c.req.param('id'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to push order to plan');
  }
});

orderRoutes.post('/:id/close', async (c) => {
  try {
    const service = new ShipmentService(c.env.DB);
    return ok(c, await service.closeOrder(c.req.param('id')));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to close order');
  }
});

orderRoutes.get('/:id/trace', async (c) => {
  const service = new OrderFlowService(c.env.DB);
  const trace = await service.getOrderTrace(c.req.param('id'));
  if (!trace) return fail(c, 'order not found', 404);
  return ok(c, trace);
});
