import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { productionExecutionListQuerySchema } from '../schemas/production-execution';
import { ProductionExecutionService } from '../services/production-execution.service';
import { ok } from '../utils/http';

export const workResourceRoutes = new Hono<AppEnv>();

workResourceRoutes.get('/', zValidator('query', productionExecutionListQuerySchema), async (c) => {
  const service = new ProductionExecutionService(c.env.DB);
  return ok(c, await service.listWorkResources(c.req.valid('query')));
});
