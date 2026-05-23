import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import {
  productionExecutionListQuerySchema,
  productionPlanCreateSchema,
  productionPlanUpdateSchema,
} from '../schemas/production-execution';
import { ProductionExecutionService } from '../services/production-execution.service';
import { fail, ok } from '../utils/http';

export const productionPlanRoutes = new Hono<AppEnv>();

productionPlanRoutes.get('/', zValidator('query', productionExecutionListQuerySchema), async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  return ok(c, await service.listPlans(c.req.valid('query')));
});

productionPlanRoutes.post('/', zValidator('json', productionPlanCreateSchema), async (c) => {
  try {
    const service = new ProductionExecutionService(c.env.DB);
    return ok(c, await service.createPlan(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create production plan');
  }
});

productionPlanRoutes.get('/:id', async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  const plan = await service.getPlan(c.req.param('id'));
  if (!plan) return fail(c, 'production plan not found', 404);
  return ok(c, plan);
});

productionPlanRoutes.patch('/:id', zValidator('json', productionPlanUpdateSchema), async (c) => {
  try {
    const service = new ProductionExecutionService(c.env.DB);
    const plan = await service.updatePlan(c.req.param('id'), c.req.valid('json'));
    if (!plan) return fail(c, 'production plan not found', 404);
    return ok(c, plan);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update production plan');
  }
});

productionPlanRoutes.post('/:id/release', async (c) => {
  try {
    const service = new ProductionExecutionService(c.env.DB);
    return ok(c, await service.releasePlan(c.req.param('id'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to release production plan');
  }
});
