import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { createMachineSchema, updateMachineSchema } from '../schemas/mes';
import { MesService } from '../services/mes.service';
import { fail, ok } from '../utils/http';

export const machineRoutes = new Hono<AppEnv>();

machineRoutes.get('/', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listMachines());
});

machineRoutes.post('/', zValidator('json', createMachineSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.createMachine(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create machine');
  }
});

machineRoutes.patch('/:id', zValidator('json', updateMachineSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    const updated = await service.updateMachine(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'machine not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update machine');
  }
});
