import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ResourceApiService } from '../services/resource-api.service';
import { renderPrintWorkOrderPage } from '../ui/print-work-order';
import { fail } from '../utils/http';

export const printRoutes = new Hono<AppEnv>();

printRoutes.get('/work-orders/:id', async (c) => {
  if (!c.env.DB) return fail(c, 'D1 binding "DB" is not configured.', 500);
  const service = new ResourceApiService(c.env.DB);
  const item = await service.getWorkOrder(c.req.param('id'));
  if (!item) return fail(c, 'work order not found', 404);
  return c.html(renderPrintWorkOrderPage(item as any));
});
