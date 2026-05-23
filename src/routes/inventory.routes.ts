import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { createFreezeSchema, inventoryAdjustSchema } from '../schemas/mes';
import { MesService } from '../services/mes.service';
import { InventoryLedgerService } from '../services/inventory-ledger.service';
import { fail, ok } from '../utils/http';

export const inventoryRoutes = new Hono<AppEnv>();

inventoryRoutes.get('/balances', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listInventoryBalances());
});

inventoryRoutes.get('/movements', async (c) => {
  const service = new MesService(c.env.DB);
  return ok(c, await service.listInventoryMovements());
});

inventoryRoutes.post('/adjust', zValidator('json', inventoryAdjustSchema), async (c) => {
  try {
    const service = new InventoryLedgerService(c.env.DB);
    const input = c.req.valid('json');
    const result = await service.createAdjustmentTransaction({
      itemId: input.material_id ?? input.product_id ?? '',
      warehouseId: input.warehouse_code,
      qtyDelta: input.qty_delta,
      quantity: Math.abs(input.qty_delta),
      sourceId: 'manual',
      sourceNo: 'manual',
      sourceType: 'manual_adjust',
      operatorName: input.created_by ?? '',

    });
    return ok(c, result);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to adjust inventory');
  }
});

inventoryRoutes.post('/freeze', zValidator('json', createFreezeSchema), async (c) => {
  try {
    const service = new MesService(c.env.DB);
    return ok(c, await service.createFreeze(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to freeze inventory');
  }
});

inventoryRoutes.post(
  '/unfreeze',
  zValidator(
    'json',
    z.object({
      freeze_id: z.string().trim().min(1),
      notes: z.string().trim().max(1000).default(''),
      actor: z.string().trim().max(120).default(''),
    })
  ),
  async (c) => {
    try {
      const service = new MesService(c.env.DB);
      const input = c.req.valid('json');
      return ok(c, await service.closeFreeze(input.freeze_id, { action: 'release', notes: input.notes, actor: input.actor }));
    } catch (e) {
      return fail(c, e instanceof Error ? e.message : 'failed to unfreeze inventory');
    }
  }
);

