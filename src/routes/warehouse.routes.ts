import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { WarehouseService } from '../services/warehouse.service';
import { createIssueSchema, createReceiptSchema, createStocktakeSchema, locationSchema, warehouseListQuerySchema, warehouseSchema } from '../schemas/warehouse';
import { fail, ok } from '../utils/http';

export const warehouseRoutes = new Hono<AppEnv>();
export const locationRoutes = new Hono<AppEnv>();
export const receiptRoutes = new Hono<AppEnv>();
export const issueRoutes = new Hono<AppEnv>();
export const stocktakeRoutes = new Hono<AppEnv>();

warehouseRoutes.get('/', async (c) => {
  const service = new WarehouseService(c.env.DB);
  return ok(c, await service.listWarehouses());
});

warehouseRoutes.post('/', zValidator('json', warehouseSchema), async (c) => {
  try {
    const service = new WarehouseService(c.env.DB);
    return ok(c, await service.createWarehouse(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create warehouse');
  }
});

locationRoutes.get('/', async (c) => {
  const service = new WarehouseService(c.env.DB);
  const warehouseCode = c.req.query('warehouseCode');
  return ok(c, await service.listLocations(warehouseCode));
});

locationRoutes.post('/', zValidator('json', locationSchema), async (c) => {
  try {
    const service = new WarehouseService(c.env.DB);
    return ok(c, await service.createLocation(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create location');
  }
});

receiptRoutes.post('/', zValidator('json', createReceiptSchema), async (c) => {
  try {
    const service = new WarehouseService(c.env.DB);
    return ok(c, await service.createReceipt(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create receipt');
  }
});

receiptRoutes.get('/', zValidator('query', warehouseListQuerySchema), async (c) => {
  const service = new WarehouseService(c.env.DB);
  return ok(c, await service.listReceipts(c.req.valid('query')));
});

issueRoutes.post('/', zValidator('json', createIssueSchema), async (c) => {
  try {
    const service = new WarehouseService(c.env.DB);
    return ok(c, await service.createIssue(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create issue');
  }
});

issueRoutes.get('/', zValidator('query', warehouseListQuerySchema), async (c) => {
  const service = new WarehouseService(c.env.DB);
  return ok(c, await service.listIssues(c.req.valid('query')));
});

stocktakeRoutes.post('/', zValidator('json', createStocktakeSchema), async (c) => {
  try {
    const service = new WarehouseService(c.env.DB);
    return ok(c, await service.createStocktake(c.req.valid('json')), 201);
  } catch (e) {
    return fail(c, e instanceof Error ? e.message : 'failed to create stocktake');
  }
});

stocktakeRoutes.get('/', zValidator('query', warehouseListQuerySchema), async (c) => {
  const service = new WarehouseService(c.env.DB);
  return ok(c, await service.listStocktakes(c.req.valid('query')));
});
