import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { listQuerySchema, customerCreateSchema, customerUpdateSchema } from '../schemas/resource';
import { ResourceApiService } from '../services/resource-api.service';
import { fail, ok } from '../utils/http';

export const customerRoutes = new Hono<AppEnv>();

customerRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const service = new ResourceApiService(c.env.DB);
  return ok(c, await service.listCustomers(c.req.valid('query')));
});

customerRoutes.post('/', zValidator('json', customerCreateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    return ok(c, await service.createCustomer(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create customer');
  }
});

customerRoutes.get('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const item = await service.getCustomer(c.req.param('id'));
  if (!item) return fail(c, 'customer not found', 404);
  return ok(c, item);
});

customerRoutes.patch('/:id', zValidator('json', customerUpdateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    const updated = await service.updateCustomer(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'customer not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update customer');
  }
});

customerRoutes.delete('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const deleted = await service.deleteCustomer(c.req.param('id'));
  if (!deleted) return fail(c, 'customer not found', 404);
  return ok(c, deleted);
});
