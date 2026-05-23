import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { listQuerySchema, projectCreateSchema, projectUpdateSchema } from '../schemas/resource';
import { ResourceApiService } from '../services/resource-api.service';
import { fail, ok } from '../utils/http';

export const projectRoutes = new Hono<AppEnv>();

projectRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const service = new ResourceApiService(c.env.DB);
  return ok(c, await service.listProjects(c.req.valid('query')));
});

projectRoutes.post('/', zValidator('json', projectCreateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    return ok(c, await service.createProject(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create project');
  }
});

projectRoutes.get('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const item = await service.getProject(c.req.param('id'));
  if (!item) return fail(c, 'project not found', 404);
  return ok(c, item);
});

projectRoutes.patch('/:id', zValidator('json', projectUpdateSchema), async (c) => {
  try {
    const service = new ResourceApiService(c.env.DB);
    const updated = await service.updateProject(c.req.param('id'), c.req.valid('json'));
    if (!updated) return fail(c, 'project not found', 404);
    return ok(c, updated);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to update project');
  }
});

projectRoutes.delete('/:id', async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const deleted = await service.deleteProject(c.req.param('id'));
  if (!deleted) return fail(c, 'project not found', 404);
  return ok(c, deleted);
});
