import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { requestActor } from '../middleware/rbac';
import { shipmentCreateSchema, shipmentListQuerySchema } from '../schemas/shipments';
import { ShipmentService } from '../services/shipment.service';
import { fail, ok } from '../utils/http';

export const shipmentRoutes = new Hono<AppEnv>();

shipmentRoutes.get('/', zValidator('query', shipmentListQuerySchema), async (c) => {
  const service = new ShipmentService(c.env.DB);
  return ok(c, await service.listShipments(c.req.valid('query')));
});

shipmentRoutes.post('/', zValidator('json', shipmentCreateSchema), async (c) => {
  try {
    const service = new ShipmentService(c.env.DB);
    return ok(c, await service.createShipment(c.req.valid('json'), requestActor(c)), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create shipment');
  }
});

shipmentRoutes.get('/:id', async (c) => {
  const service = new ShipmentService(c.env.DB);
  const shipment = await service.getShipment(c.req.param('id'));
  if (!shipment) return fail(c, 'shipment not found', 404);
  return ok(c, shipment);
});
