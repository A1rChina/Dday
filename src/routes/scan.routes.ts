import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { scanWorkOrderSchema } from '../schemas/mes';
import { ResourceApiService } from '../services/resource-api.service';
import { fail, ok } from '../utils/http';

export const scanRoutes = new Hono<AppEnv>();

scanRoutes.post('/work-order', zValidator('json', scanWorkOrderSchema), async (c) => {
  const service = new ResourceApiService(c.env.DB);
  const item = await service.getWorkOrder(normalizeScanCode(c.req.valid('json').code));
  if (!item) return fail(c, 'work order not found', 404);
  return ok(c, item);
});

function normalizeScanCode(value: string): string {
  const text = value.trim();
  if (text.startsWith('WO:')) return text.slice(3).trim();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.type === 'work_order' && typeof parsed.code === 'string') return parsed.code.trim();
    } catch {
      return text;
    }
  }
  return text;
}
