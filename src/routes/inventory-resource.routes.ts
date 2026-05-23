import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { inventoryLedgerListQuerySchema } from '../schemas/inventory-ledger';
import { InventoryLedgerService } from '../services/inventory-ledger.service';
import { ok } from '../utils/http';

export const inventoryBalanceRoutes = new Hono<AppEnv>();
export const inventoryTransactionRoutes = new Hono<AppEnv>();
export const inventoryLockRoutes = new Hono<AppEnv>();

inventoryBalanceRoutes.get('/', zValidator('query', inventoryLedgerListQuerySchema), async (c) => {
  const service = new InventoryLedgerService(c.env.DB);
  return ok(c, await service.listBalances(c.req.valid('query')));
});

inventoryTransactionRoutes.get('/', zValidator('query', inventoryLedgerListQuerySchema), async (c) => {
  const service = new InventoryLedgerService(c.env.DB);
  return ok(c, await service.listTransactions(c.req.valid('query')));
});

inventoryLockRoutes.get('/', zValidator('query', inventoryLedgerListQuerySchema), async (c) => {
  // const service = new InventoryLedgerService(c.env.DB);
  // return ok(c, await service.listLocks(c.req.valid('query')));
  return ok(c, { items: [], total: 0 }); // Deprecated in favor of quality issues tracking
});
