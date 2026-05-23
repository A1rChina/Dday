import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { createProcessSchema, updateProcessSchema } from '../schemas/mes';
import { MesService } from '../services/mes.service';
import { fail, ok } from '../utils/http';

export const processRoutes = new Hono<AppEnv>();

processRoutes.get('/', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listProcesses());
});

processRoutes.post('/', zValidator('json', createProcessSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.createProcess(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create process');
  }
});

processRoutes.patch('/:id', zValidator('json', updateProcessSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    const updated = await service.updateProcess(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'process not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update process');
  }
});
