import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { listQuerySchema, productCreateSchema, productUpdateSchema } from '../schemas/resource';
import { ResourceApiService } from '../services/resource-api.service';
import { fail, ok } from '../utils/http';

export const productRoutes = new Hono<AppEnv>();

productRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const service = new ResourceApiService(c.env.DB);
  return ok(c, await service.listProducts(c.req.valid('query')));
});

productRoutes.post('/', zValidator('json', productCreateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    return ok(c, await service.createProduct(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create product');
  }
});

productRoutes.get('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const item = await service.getProduct(c.req.param('id'));
  if (!item) return fail(c, 'product not found', 404);
  return ok(c, item);
});

productRoutes.patch('/:id', zValidator('json', productUpdateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    const updated = await service.updateProduct(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'product not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update product');
  }
});

productRoutes.delete('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const deleted = await service.deleteProduct(c.req.param('id'));
  if (!deleted) return fail(c, 'product not found', 404);
  return ok(c, deleted);
});
