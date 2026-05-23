import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { listQuerySchema } from '../schemas/resource';
import { ResourceApiService } from '../services/resource-api.service';
import { ok } from '../utils/http';

export const manufacturingFactoryRoutes = new Hono<AppEnv>();

manufacturingFactoryRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const service = new ResourceApiService(c.env.DB);
  return ok(c, await service.listManufacturingFactories(c.req.valid('query')));
});
