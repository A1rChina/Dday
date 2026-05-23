import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { createMaterialSchema, updateMaterialSchema } from '../schemas/mes';
import { MesService } from '../services/mes.service';
import { fail, ok } from '../utils/http';

export const materialRoutes = new Hono<AppEnv>();

materialRoutes.get('/', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listMaterials());
});

materialRoutes.post('/', zValidator('json', createMaterialSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.createMaterial(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create material');
  }
});

materialRoutes.patch('/:id', zValidator('json', updateMaterialSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    const updated = await service.updateMaterial(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'material not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update material');
  }
});
