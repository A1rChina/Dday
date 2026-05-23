import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import { orderFlowListQuerySchema, qualityIssueActionSchema, qualityIssueCreateSchema, qualityIssueUpdateSchema } from '../schemas/order-flow';
import { OrderFlowService } from '../services/order-flow.service';
import { fail, ok } from '../utils/http';

export const qualityIssueRoutes = new Hono<AppEnv>();

qualityIssueRoutes.get('/', zValidator('query', orderFlowListQuerySchema), async (c) => {
  const service = new OrderFlowService(c.env.DB);
  return ok(c, await service.listQualityIssues(c.req.valid('query')));
});

qualityIssueRoutes.post('/', zValidator('json', qualityIssueCreateSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.createQualityIssue(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create quality issue');
  }
});

qualityIssueRoutes.get('/:id', async (c) => {
  const service = new OrderFlowService(c.env.DB);
  const item = await service.getQualityIssue(c.req.param('id'));
  if (!item) return fail(c, 'quality issue not found', 404);
  return ok(c, item);
});

qualityIssueRoutes.patch('/:id', zValidator('json', qualityIssueUpdateSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    const updated = await service.updateQualityIssue(c.req.param('id'), c.req.valid('json'), requestActor(c));
    if (!updated) return fail(c, 'quality issue not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update quality issue');
  }
});

qualityIssueRoutes.post('/:id/unfreeze', zValidator('json', qualityIssueActionSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.unfreezeQualityIssue(c.req.param('id'), c.req.valid('json'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to unfreeze inventory');
  }
});

qualityIssueRoutes.post('/:id/scrap', zValidator('json', qualityIssueActionSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.scrapQualityIssue(c.req.param('id'), c.req.valid('json'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to scrap inventory');
  }
});

qualityIssueRoutes.post('/:id/close', zValidator('json', qualityIssueActionSchema), async (c) => {
  try {
    const service = new OrderFlowService(c.env.DB);
    return ok(c, await service.closeQualityIssue(c.req.param('id'), c.req.valid('json'), requestActor(c)));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to close quality issue');
  }
});
