import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { createReportSchema } from '../schemas/mes';
import { pdaReportSchema } from '../schemas/resource';
import { MesService } from '../services/mes.service';
import { fail, ok } from '../utils/http';

export const reportRoutes = new Hono<AppEnv>();

reportRoutes.get('/', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listReports(c.req.query('work_order_id')));
});

reportRoutes.post('/', zValidator('json', createReportSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const service = new MesService(c.env.DB);
    return ok(c, await service.createReport(input), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create report');
  }
});

reportRoutes.post('/pda', zValidator('json', pdaReportSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.createReport({ ...c.req.valid('json'), operator_name: 'PDA', notes: '' }), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to submit PDA report');
  }
});
