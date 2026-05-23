import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { AppEnv } from './types';
import { authMiddleware } from './middleware/auth';
import { rbacContextMiddleware } from './middleware/rbac';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/users.routes';
import { roleRoutes } from './routes/roles.routes';

import { materialRoutes } from './routes/materials.routes';
import { productRoutes } from './routes/products.routes';
import { processRoutes } from './routes/processes.routes';
import { machineRoutes } from './routes/machines.routes';
import { workOrderRoutes } from './routes/work-orders.routes';
import { workResourceRoutes } from './routes/work-resources.routes';
import { reportRoutes } from './routes/reports.routes';
import { inventoryRoutes } from './routes/inventory.routes';
import { freezeRoutes } from './routes/freezes.routes';
import { scanRoutes } from './routes/scan.routes';
import { printRoutes } from './routes/print.routes';
import { supplyChainRoutes } from './routes/supply-chain.routes';
import { permissionRoutes } from './routes/permissions.routes';
import { orderRoutes } from './routes/orders.routes';
import { productionPlanRoutes } from './routes/production-plans.routes';
import { receiptRoutes } from './routes/receipts.routes';
import { qualityIssueRoutes } from './routes/quality-issues.routes';
import { deliveryPlanRoutes } from './routes/delivery-plans.routes';
import { materialDeliveryPlanRoutes } from './routes/material-delivery-plans.routes';
import { warehouseReceiptRoutes } from './routes/warehouse-receipts.routes';
import { customerRoutes } from './routes/customers.routes';
import { profileSupplierRoutes } from './routes/profile-suppliers.routes';
import { manufacturingFactoryRoutes } from './routes/manufacturing-factories.routes';
import { inventoryBalanceRoutes, inventoryLockRoutes, inventoryTransactionRoutes } from './routes/inventory-resource.routes';
import { shipmentRoutes } from './routes/shipments.routes';
import { projectRoutes } from './routes/projects.routes';
import { reportingRoutes } from './routes/reporting.routes';
import { warehouseRoutes, locationRoutes, receiptRoutes as inventoryReceiptRoutes, issueRoutes, stocktakeRoutes } from './routes/warehouse.routes';
import { renderScanPage } from './ui/scan-page';
import { fail } from './utils/http';

const app = new Hono<AppEnv>();

app.use('*', logger());

app.get('/scan', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.html(renderScanPage());
});
app.route('/print', printRoutes);
app.get('/healthz', async (c) => {
  const db = c.env.DB;
  const database = {
    binding: Boolean(db),
    connected: false,
    schema_ready: false,
    demand_count: null as number | null,
    error: null as string | null,
  };

  if (db) {
    try {
      await db.prepare('SELECT 1').first();
      database.connected = true;

      const row = await db.prepare('SELECT COUNT(*) AS count FROM customer_demands').first<{ count: number }>();
      database.schema_ready = true;
      database.demand_count = row?.count ?? 0;
    } catch (e) {
      database.error = e instanceof Error ? e.message : 'D1 health check failed';
    }
  }

  return c.json({
    ok: database.binding && database.connected && database.schema_ready,
    service: 'cf-taskflow-hono',
    database,
  });
});

app.route('/api/auth', authRoutes);

app.use('/api/*', authMiddleware);
app.use('/api/*', async (c, next) => {
  if (!c.env.DB) {
    return fail(c, 'D1 binding "DB" is not configured. Check wrangler.jsonc and redeploy.', 500);
  }
  await next();
});
app.use('/api/*', rbacContextMiddleware);

app.route('/api/materials', materialRoutes);
app.route('/api/products', productRoutes);
app.route('/api/processes', processRoutes);
app.route('/api/machines', machineRoutes);
app.route('/api/work-orders', workOrderRoutes);
app.route('/api/work-resources', workResourceRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/inventory', inventoryRoutes);
app.route('/api/freezes', freezeRoutes);
app.route('/api/scan', scanRoutes);
app.route('/api/supply-chain', supplyChainRoutes);
app.route('/api/users', userRoutes);
app.route('/api/roles', roleRoutes);
app.route('/api/permissions', permissionRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/production-plans', productionPlanRoutes);
app.route('/api/receipts', receiptRoutes);
app.route('/api/quality-issues', qualityIssueRoutes);
app.route('/api/delivery-plans', deliveryPlanRoutes);
app.route('/api/material-delivery-plans', materialDeliveryPlanRoutes);
app.route('/api/warehouse-receipts', warehouseReceiptRoutes);
app.route('/api/customers', customerRoutes);
app.route('/api/profile-suppliers', profileSupplierRoutes);
app.route('/api/manufacturing-factories', manufacturingFactoryRoutes);
app.route('/api/inventory-balances', inventoryBalanceRoutes);
app.route('/api/inventory-locks', inventoryLockRoutes);
app.route('/api/inventory-transactions', inventoryTransactionRoutes);
app.route('/api/shipments', shipmentRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/reporting', reportingRoutes);
app.route('/api/warehouses', warehouseRoutes);
app.route('/api/locations', locationRoutes);
app.route('/api/inventory-receipts', inventoryReceiptRoutes);
app.route('/api/inventory-issues', issueRoutes);
app.route('/api/inventory-stocktakes', stocktakeRoutes);

app.notFound((c) => {
  if (!c.req.path.startsWith('/api') && c.env.ASSETS) {
    return serveAssetOrAdminShell(c);
  }
  return fail(c, 'not found', 404);
});
app.onError((err, c) => {
  console.error(err);
  return fail(c, err.message || 'internal error', 500);
});

export default app;

async function serveAssetOrAdminShell(c: Parameters<Parameters<typeof app.notFound>[0]>[0]) {
  const assetResponse = await c.env.ASSETS!.fetch(c.req.raw);
  if (assetResponse.status !== 404) return assetResponse;

  const url = new URL(c.req.url);
  url.pathname = '/';
  url.search = '';
  return c.env.ASSETS!.fetch(new Request(url, c.req.raw));
}
