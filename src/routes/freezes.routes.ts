import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { closeFreezeSchema, createFreezeSchema, updateFreezeSchema } from '../schemas/mes';
import { MesService } from '../services/mes.service';
import { fail, ok } from '../utils/http';

export const freezeRoutes = new Hono<AppEnv>();

freezeRoutes.get('/', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listFreezes());
});

freezeRoutes.post('/', zValidator('json', createFreezeSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.createFreeze(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create freeze');
  }
});

freezeRoutes.get('/:id', async (c) => {
  const service = new MesService(c.env.DB);
  const item = await service.getFreeze(c.req.param('id'));
  if (!item) return fail(c, 'freeze not found', 404);
  return ok(c, item);
});

freezeRoutes.patch('/:id', zValidator('json', updateFreezeSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    const updated = await service.updateFreeze(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'freeze not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update freeze');
  }
});

freezeRoutes.post('/:id/close', zValidator('json', closeFreezeSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.closeFreeze(c.req.param('id'), c.req.valid('json')));
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to close freeze');
  }
});
