import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { workOrderCreateSchema } from '../schemas/resource';
import { productionExecutionListQuerySchema, workOrderUpdateForPlanSchema } from '../schemas/production-execution';
import { ResourceApiService } from '../services/resource-api.service';
import { ProductionExecutionService } from '../services/production-execution.service';
import { fail, ok } from '../utils/http';

export const workOrderRoutes = new Hono<AppEnv>();

workOrderRoutes.get('/', zValidator('query', productionExecutionListQuerySchema), async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  return ok(c, await service.listWorkOrders(c.req.valid('query')));
});

workOrderRoutes.post('/', zValidator('json', workOrderCreateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    return ok(c, await service.createWorkOrder(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create work order');
  }
});

workOrderRoutes.get('/:id', async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  const item = await service.getWorkOrder(c.req.param('id'));
  if (!item) return fail(c, 'work order not found', 404);
  return ok(c, item);
});

workOrderRoutes.patch('/:id', zValidator('json', workOrderUpdateForPlanSchema), async (c) => {
  try {
    const service = new ProductionExecutionService(c.env.DB);
    const updated = await service.updateWorkOrder(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'work order not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update work order');
  }
});

workOrderRoutes.post('/:id/release', async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  const updated = await service.updateWorkOrder(c.req.param('id'), { status: 'released' });
  if (!updated) return fail(c, 'work order not found', 404);
  return ok(c, updated);
});

workOrderRoutes.post('/:id/close', async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  const updated = await service.updateWorkOrder(c.req.param('id'), { status: 'completed' });
  if (!updated) return fail(c, 'work order not found', 404);
  return ok(c, updated);
});
