# Database Schema Guide

The database is Cloudflare D1 SQLite, modeled in `src/db/schema.ts` with Drizzle. The schema covers RBAC, master data, demand/order flow, production execution, warehouse inventory, quality, delivery, shipment, and reporting.

## System And Security

### `users`

Application users. Stores login username, password hash, display name, role, active flag, and timestamps.

### `roles`

Role definitions such as admin, planner, operator, or viewer. Used by RBAC.

### `permissions`

Atomic permission points grouped by module and action.

### `role_permissions`

Join table between roles and permissions.

### `operation_logs`

Audit log for create/update/delete and other important entity operations.

## Master Data

### `customers`

Customer master data with contact and delivery address information.

### `profile_suppliers`

Supplier master data, including contact details, address, lead time, status, and remarks.

### `parts`

Part/profile material master data. Stores part ID, name, part number, unit, status, and remark.

### `manufacturing_factories`

Factory master data. Used to bind project parts/products to manufacturing locations.

### `projects`

Project master data. Connects project code/name to a customer/party and lifecycle status.

### `project_parts`

Project-specific part configuration. Stores customer, supplier, factory, profile material code/name, unit usage, safety stock, warning stock, and status.

### `products`

Product master data used by orders, production, and work orders. Includes product code/name, unit, process route, project/customer relation, factory, and profile code.

### `product_materials`

Mapping between products and required materials.

### `materials`

Material master data for production and supply flows.

### `parties`

Generic party table used by some newer order/project flows. Can represent customer or supplier-like entities.

### `attachments`

Metadata for uploaded files or external file references attached to business documents.

## Process And Resource Master Data

### `processes`

Manufacturing process definitions.

### `machines`

Machine/equipment definitions.

### `work_resources`

Production resources that can be assigned to work orders or process steps.

### `work_order_steps`

Step-level routing/progress records for each work order.

## Demand And Order Flow

### `customer_orders`

Customer order header. Stores order code, customer, source type/file, requested date, status, and notes.

### `customer_order_items`

Order lines for products/materials, quantities, due dates, and current production/shipment status.

### `demand_plan_versions`

Version records for demand planning changes or imported demand snapshots.

### `customer_demands`

Demand header for an alternate demand management flow.

### `demand_lines`

Demand line details, including material/product, quantity, delivery date, and status.

### `customer_demand_lines`

Additional demand line model used by newer demand pool flows.

### `order_lines`

Normalized order-line table used for cross-module planning and fulfillment tracking.

### `production_demand_links`

Join table connecting production plans/work orders to originating demand lines.

## Production Planning And Execution

### `production_plans`

Production plan header. Stores plan date, title, customer/project/product/material references, quantities, date windows, readiness status, risk level, and lifecycle status.

### `production_plan_items`

Line-level planned production items under a production plan.

### `work_orders`

Executable production work orders. Tracks product/material, planned quantity, reported/good/defect/scrap quantities, dates, status, current step, and completion/closure timestamps.

### `production_reports`

Production reporting records. Captures reported quantities, good/defect/scrap output, operator, and timestamps.

### `process_cards`

Process card definitions and printable/reportable process documents.

### `route_operations`

Operations in a process route, including sequence and process/resource metadata.

### `operation_reports`

Detailed operation-level reports from production execution.

### `wip_transactions`

Work-in-progress inventory movements during production.

## Inventory And Warehouse

### `inventory_balances`

Current stock ledger by item, project, customer, warehouse, location, and inventory status. This is the main table for inventory overview and detail queries.

Important fields:

- `item_id`, `item_code`, `item_name`, `item_type`: inventory object identity.
- `project_id`, `project_code`: project dimension.
- `customer_id`, `customer_name`: customer dimension.
- `warehouse_id`, `warehouse_name`, `location_id`, `location_code`: warehouse dimensions.
- `inventory_status`: available/frozen/held/scrap-style stock state.
- `quantity`, `unit`: current quantity.
- `source_no`: last related source document number.
- `last_transaction_at`, `updated_at`: traceability timestamps.

### `inventory_transactions`

Immutable inventory movement ledger. Every receipt, issue, adjustment, freeze, unfreeze, production in, scrap, or stocktake difference should be recorded here.

Important fields:

- `transaction_no`: unique ledger movement number.
- `transaction_type`: receipt, issue, adjustment, inventory_freeze, inventory_unfreeze, etc.
- `quantity_change`, `before_quantity`, `after_quantity`: numeric movement trace.
- `from_status`, `to_status`: stock status transition.
- `source_type`, `source_id`, `source_no`: related business document.
- `operator_id`, `operator_name`: actor trace.
- `occurred_at`: business occurrence timestamp.

### `inventory_holds`

Inventory freeze/hold records for quality or abnormal handling. Tracks hold quantity, processed quantity, remaining quantity, abnormal type, discovery stage, responsible party, handling plan, status, and close expectations.

### `warehouses`

Warehouse master data. Stores code, name, type, status, and remark.

### `locations`

Warehouse location/bin master data. Stores warehouse code, location code/name, status, and remark.

### `receipts`

Inventory receipt document header used by the warehouse module.

### `receipt_items`

Line items under warehouse inventory receipts. Stores item, project, batch, quantity, warehouse, and location.

### `issues`

Inventory issue document header used by the warehouse module.

### `issue_items`

Line items under warehouse inventory issues. Stores item, project, batch, quantity, warehouse, and location.

### `stocktakes`

Stocktake document header. Stores warehouse, stocktake date, status, actor, and notes.

### `stocktake_items`

Stocktake line items. Stores item, project, batch, system quantity, actual quantity, difference, and location.

### `material_receipts`

Material receipt records used by the order/material flow.

### `warehouse_receipts`

Warehouse receipt records linked to material delivery plans.

## Quality

### `quality_abnormal_records`

Production/reporting quality abnormal records.

### `quality_issues`

Quality issue header for operational abnormal handling. Can connect to inventory locks/freezes, source documents, severity, quantity, and status.

### `issue_actions`

Action history for quality issues.

## Delivery And Shipment

### `material_delivery_plans`

Planned inbound material delivery. Tracks supplier, material, quantity, planned ship date, arrival status, and notes.

### `delivery_plans`

Outbound delivery plan header.

### `delivery_plan_items`

Outbound delivery plan line items.

### `shipments`

Shipment header. Tracks customer/project/order linkage, planned/actual ship date, status, and notes.

### `shipment_items`

Shipment lines. Tracks product/material, quantity, and related order lines.

## Supply Chain And Events

### `supply_chain_events`

Cross-module event timeline for supply chain visibility and traceability.

## Reporting Relationships

The most important operational traceability path is:

```text
Customer demand/order
  -> production plan
  -> work order / reporting
  -> inventory transaction
  -> inventory balance
  -> delivery / shipment
```

Warehouse documents trace through:

```text
receipts / issues / stocktakes
  -> receipt_items / issue_items / stocktake_items
  -> inventory_transactions
  -> inventory_balances
```

Quality handling traces through:

```text
quality_issues
  -> inventory_holds
  -> inventory_transactions
  -> inventory_balances
```

## Notes For Future Improvement

- Supplier, batch, and safety-stock analysis should be normalized into inventory query views or joined APIs so warehouse filtering can cover supplier, batch, overdue, and low-stock rules without frontend-only placeholders.
- Inventory documents and ledger records should eventually share a stricter source document contract.
- For analytics-heavy warehouse screens, consider adding read-optimized views for stock by project/customer/warehouse/status and stock aging.
