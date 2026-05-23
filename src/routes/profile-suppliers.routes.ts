import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { listQuerySchema, supplierCreateSchema, supplierUpdateSchema } from '../schemas/resource';
import { ResourceApiService } from '../services/resource-api.service';
import { fail, ok } from '../utils/http';

export const profileSupplierRoutes = new Hono<AppEnv>();

profileSupplierRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const service = new ResourceApiService(c.env.DB);
  return ok(c, await service.listProfileSuppliers(c.req.valid('query')));
});

profileSupplierRoutes.post('/', zValidator('json', supplierCreateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    return ok(c, await service.createProfileSupplier(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create supplier');
  }
});

profileSupplierRoutes.get('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const item = await service.getProfileSupplier(c.req.param('id'));
  if (!item) return fail(c, 'supplier not found', 404);
  return ok(c, item);
});

profileSupplierRoutes.patch('/:id', zValidator('json', supplierUpdateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    const updated = await service.updateProfileSupplier(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'supplier not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update supplier');
  }
});

profileSupplierRoutes.delete('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const deleted = await service.deleteProfileSupplier(c.req.param('id'));
  if (!deleted) return fail(c, 'supplier not found', 404);
  return ok(c, deleted);
});
