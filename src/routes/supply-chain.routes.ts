import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requirePermission, requestActor } from '../middleware/rbac';
import {
  confirmShipmentSchema,
  createDeliveryPlanSchema,
  createProductionPlanSchema,
  createQualityIssueSchema,
  importOrderSchema,
  issueActionSchema,
  receiveMaterialSchema,
  updateOrderStatusSchema,
} from '../schemas/supply-chain';
import { SupplyChainService } from '../services/supply-chain.service';
import { fail, ok } from '../utils/http';

export const supplyChainRoutes = new Hono<AppEnv>();

supplyChainRoutes.get('/flow', requirePermission('supply:read'), async (c) => {
  const service = new SupplyChainService(c.env.DB);
  return ok(c, await service.getOverview(c.req.query('order_id')));
});

supplyChainRoutes.post('/orders/import', requirePermission('order:import'), zValidator('json', importOrderSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.importOrder({ ...input, imported_by: input.imported_by || requestActor(c) }), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to import order');
  }
});

supplyChainRoutes.patch('/orders/:id/status', requirePermission('order:update'), zValidator('json', updateOrderStatusSchema), async (c) => {
  const service = new SupplyChainService(c.env.DB);
  const updated = await service.updateOrderStatus(c.req.param('id'), c.req.valid('json'));
  if (!updated) return fail(c, 'order not found', 404);
  return ok(c, updated);
});

supplyChainRoutes.post('/receipts', requirePermission('receipt:create'), zValidator('json', receiveMaterialSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.receiveMaterial({ ...input, received_by: input.received_by || requestActor(c) }), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to receive material');
  }
});

supplyChainRoutes.post('/production-plans', requirePermission('plan:manage'), zValidator('json', createProductionPlanSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.createProductionPlan({ ...input, created_by: input.created_by || requestActor(c) }), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create production plan');
  }
});

supplyChainRoutes.post('/production-plans/:id/release', requirePermission('plan:manage'), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    return ok(c, await service.releaseProductionPlan(c.req.param('id'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to release production plan');
  }
});

supplyChainRoutes.post('/delivery-plans', requirePermission('delivery:manage'), zValidator('json', createDeliveryPlanSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.createDeliveryPlan({ ...input, created_by: input.created_by || requestActor(c) }), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create delivery plan');
  }
});

supplyChainRoutes.post('/delivery-plans/:id/confirm', requirePermission('delivery:manage'), zValidator('json', confirmShipmentSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.confirmShipment(c.req.param('id'), { ...input, confirmed_by: input.confirmed_by || requestActor(c) }));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to confirm shipment');
  }
});

supplyChainRoutes.post('/quality-issues', requirePermission('quality:manage'), zValidator('json', createQualityIssueSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.createQualityIssue({ ...input, owner: input.owner || requestActor(c) }), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create quality issue');
  }
});

supplyChainRoutes.post('/quality-issues/:id/actions', requirePermission('quality:manage'), zValidator('json', issueActionSchema), async (c) => {
  try {
    const service = new SupplyChainService(c.env.DB);
    const input = c.req.valid('json');
    return ok(c, await service.addIssueAction(c.req.param('id'), { ...input, actor: input.actor || requestActor(c) }));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to add issue action');
  }
});
