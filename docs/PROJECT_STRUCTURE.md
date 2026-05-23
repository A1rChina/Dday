# Project Structure

This project is a Cloudflare Workers based ERP/MES Lite application. The backend is built with Hono and Cloudflare D1, while the admin frontend is a Vite + React + Ant Design/Refine single page app.

## Root Files

- `package.json`: npm scripts and dependency list. Important scripts include `dev`, `build`, `deploy`, and D1 migration helpers.
- `package-lock.json`: locked dependency versions for reproducible installs.
- `wrangler.jsonc`: Cloudflare Worker configuration, including D1 and static asset bindings.
- `vite.config.ts`: Vite build configuration for the admin frontend.
- `tsconfig.json`: TypeScript compiler configuration.
- `index.html`: Vite frontend entry HTML.
- `.dev.vars.example`: example local environment variables.
- `.gitignore`: excludes generated artifacts, local secrets, local Wrangler state, and dependencies.
- `README.md`: project setup and usage notes.
- `seed-real-data.sql`: sample or real seed data used to initialize local/demo data.
- `note.md`: working notes and business context captured during development.
- `fix*.cjs`, `wrappers.cjs`: one-off maintenance scripts used during earlier code transformations. These should be reviewed before keeping long term.

## Source Layout

### `src/index.ts`

Main Worker entrypoint. It creates the Hono app, registers middleware, mounts all API routes, exposes `/healthz`, `/scan`, `/print`, and serves the built admin SPA from Cloudflare Assets.

Key responsibilities:

- Request logging.
- Authentication and RBAC middleware for `/api/*`.
- D1 binding health check.
- API route registration.
- SPA fallback for non-API paths.

### `src/routes`

HTTP route layer. Each file maps URL endpoints to services and schemas.

- `auth.routes.ts`: login/session style authentication endpoints.
- `users.routes.ts`, `roles.routes.ts`, `permissions.routes.ts`: user, role, and permission administration.
- `customers.routes.ts`, `profile-suppliers.routes.ts`, `manufacturing-factories.routes.ts`, `parts.routes.ts`, `project-parts.routes.ts`, `projects.routes.ts`, `products.routes.ts`: master data APIs.
- `orders.routes.ts`, `production-plans.routes.ts`, `work-orders.routes.ts`: demand, planning, and work order flows.
- `reporting.routes.ts`, `reports.routes.ts`: production execution reporting.
- `inventory.routes.ts`: inventory actions such as manual adjustment, freeze, and unfreeze.
- `inventory-resource.routes.ts`: inventory balances, transactions, and lock list APIs.
- `warehouse.routes.ts`: warehouse, location, inventory receipt, issue, and stocktake APIs.
- `warehouse-receipts.routes.ts`, `receipts.routes.ts`: material receipt flows used by supply/order modules.
- `quality-issues.routes.ts`, `freezes.routes.ts`: quality exceptions and inventory freeze handling.
- `delivery-plans.routes.ts`, `material-delivery-plans.routes.ts`, `shipments.routes.ts`: delivery and shipment APIs.
- `scan.routes.ts`, `print.routes.ts`: PDA scan and print views.
- `supply-chain.routes.ts`: supply chain dashboard and cross-module APIs.

### `src/services`

Business logic layer. Services isolate database operations and domain behavior from route handlers.

- `inventory-ledger.service.ts`: inventory balance and transaction ledger. Handles receipts, issues, adjustments, freeze/unfreeze, stocktake adjustments, filtering, sorting, and summary statistics.
- `warehouse.service.ts`: warehouse master data plus receipt, issue, and stocktake document creation/listing.
- `order-flow.service.ts`: customer demand, order intake, production planning linkage, and material receipt workflow.
- `production-execution.service.ts`: production execution, work order progress, reporting, and resource handling.
- `reporting.service.ts`: process card and reporting module behavior.
- `material-delivery.service.ts`: material delivery plans and warehouse receipt confirmation.
- `shipment.service.ts`: shipment and delivery close-out logic.
- `supply-chain.service.ts`: supply chain overview, cross-module aggregation, and operational query APIs.
- `resource-api.service.ts`: generic resource CRUD/listing for master data and operational resources.
- `mes.service.ts`: legacy or shared MES operations that remain used by several flows.

### `src/schemas`

Zod schemas for request validation and query parsing.

- `inventory-ledger.ts`: inventory balance/transaction query parameters.
- `warehouse.ts`: warehouse, location, receipt, issue, and stocktake payloads.
- `order-flow.ts`: order, receipt, planning, delivery, and quality payloads.
- `resource.ts`: master data and work order resource payloads.
- `production-execution.ts`, `reporting.ts`, `material-delivery.ts`, `shipments.ts`, `supply-chain.ts`, `mes.ts`: module-specific validation.

### `src/db`

Database integration.

- `schema.ts`: Drizzle schema definitions for every D1 table.
- `client.ts`: creates the Drizzle D1 database client.

### `src/middleware`

Cross-cutting request behavior.

- `auth.ts`: validates application token/auth state.
- `rbac.ts`: resolves request actor/role and enforces permission checks.

### `src/admin`

Admin frontend.

- `main.tsx`: React entrypoint and Refine provider setup.
- `AdminApp.tsx`: shell layout, navigation, route-like resource switching.
- `resourceDataProvider.ts`: Refine data provider for `/api/*`, including pagination, filters, sorting, create/update/delete.
- `authProvider.ts`: frontend auth provider.
- `styles.css`, `entity-drawer.css`: global UI styling.

### `src/admin/ui`

Feature pages in the admin app.

- `InventoryResource.tsx`: professional warehouse inventory workbench with advanced filters, summary cards, balance details, transaction ledger, related documents, export, saved query schemes, and detail drawer.
- `ReceiptResource.tsx`, `IssueResource.tsx`, `StocktakeResource.tsx`: inventory receipt, issue, and stocktake document pages.
- `WarehouseConfigResource.tsx`: warehouse and location setup.
- `OrderResource.tsx`: demand/order pool.
- `PlanResource.tsx`: production planning.
- `WorkOrderResource.tsx`: work order management.
- `ReportingResource.tsx`: production reporting.
- `QualityResource.tsx`: quality issue handling and inventory freeze/scrap actions.
- `DeliveryResource.tsx`: delivery plan/material arrival workflows.
- `ProductResource.tsx`: product and project-part master data.
- `UserResource.tsx`, `RoleResource.tsx`, `PermissionResource.tsx`: system administration.
- `Login.tsx`: login page.

### `src/admin/ui/components`

Reusable UI building blocks.

- `AppPage`, `AppPageHeader`: page shell and page header.
- `AppProTable`, `AppProForm`: standardized Pro Components wrappers.
- `AppDrawerForm`, `AppModalForm`: drawer/modal form patterns.
- `AppSearchForm`, `AppToolbar`, `AppTableActions`, `AppStatusTag`: common enterprise UI utilities.
- `EnterprisePageLayout.tsx`: additional dense enterprise layout components.

### `src/ui`

Server-rendered utility pages.

- `scan-page.ts`: PDA/scan HTML page.
- `print-work-order.ts`: printable work order HTML.

### `src/utils`

Small shared helpers.

- `date.ts`: date normalization and current timestamp helpers.
- `id.ts`: ID generation.
- `http.ts`: API response helpers.
- `week.ts`: ISO week utilities.
- `warehouse.ts`: product-to-warehouse helper.
- `delimited.ts`: delimited text parser.
- `hash.ts`: hashing utility.

## Migrations

The `migrations` folder contains ordered D1 SQL migrations. The latest migrations define warehouse documents, inventory ledger rebuilds, inventory holds, and the newer master data/order flow model.

Use:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## Build And Deployment

- Local Worker: `npm run dev`
- Admin dev server: `npm run admin:dev`
- Typecheck and build: `npm run build`
- Deploy to Cloudflare: `npm run deploy`

The deployed Worker serves both the API and the built admin frontend.
