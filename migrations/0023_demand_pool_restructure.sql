-- Migration: 0023_demand_pool_restructure.sql

-- 1. Create new tables
CREATE TABLE IF NOT EXISTS customer_demands (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_file_name TEXT NOT NULL DEFAULT '',
  demand_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'imported',
  requested_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demand_lines (
  id TEXT PRIMARY KEY NOT NULL,
  demand_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  project_code TEXT,
  product_id TEXT,
  product_code TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  quantity INTEGER NOT NULL,
  delivered_quantity INTEGER NOT NULL DEFAULT 0,
  unshipped_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  due_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (demand_id) REFERENCES customer_demands(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS production_demand_links (
  id TEXT PRIMARY KEY NOT NULL,
  production_plan_id TEXT NOT NULL,
  demand_line_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (production_plan_id) REFERENCES production_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (demand_line_id) REFERENCES demand_lines(id) ON DELETE CASCADE
);

-- 2. Alter existing tables to add nullable fields for demand tracking
ALTER TABLE production_plans ADD COLUMN project_code TEXT;
ALTER TABLE production_plans ADD COLUMN product_code TEXT;
ALTER TABLE production_plans ADD COLUMN material_code TEXT;
ALTER TABLE production_plans ADD COLUMN plan_period TEXT;

ALTER TABLE shipments ADD COLUMN demand_id TEXT;
ALTER TABLE shipments ADD COLUMN demand_line_id TEXT;

-- 3. Backfill data from customer_orders and customer_order_items
INSERT OR IGNORE INTO customer_demands (
  id, code, customer_id, customer_name, source_type, source_file_name,
  demand_version, status, requested_date, notes, created_at, updated_at
)
SELECT
  id, code, customer_id, customer_name, source_type, source_file_name,
  demand_version, status, requested_date, notes, created_at, updated_at
FROM customer_orders;

INSERT OR IGNORE INTO demand_lines (
  id, demand_id, code, customer_id, customer_name, project_code,
  product_id, product_code, product_name, source_type, quantity,
  delivered_quantity, unshipped_quantity, status, due_date, notes,
  created_at, updated_at
)
SELECT
  i.id,
  i.order_id,
  i.id,
  o.customer_id,
  o.customer_name,
  p.project_code,
  i.product_id,
  i.product_code,
  i.product_name,
  o.source_type,
  i.quantity,
  i.delivered_quantity,
  (i.quantity - i.delivered_quantity),
  i.status,
  i.due_date,
  i.notes,
  i.created_at,
  i.updated_at
FROM customer_order_items i
LEFT JOIN customer_orders o ON i.order_id = o.id
LEFT JOIN products p ON i.product_id = p.id;

-- 4. Backfill production_demand_links
-- Case 4a: Link production plans that point directly to customer_orders (historical plans)
INSERT OR IGNORE INTO production_demand_links (id, production_plan_id, demand_line_id, quantity, created_at)
SELECT
  'link-' || p.id || '-' || dl.id,
  p.id,
  dl.id,
  p.plan_qty,
  p.created_at
FROM production_plans p
JOIN demand_lines dl ON p.order_line_id = dl.demand_id
WHERE p.order_line_id IS NOT NULL;

-- Case 4b: Link production plans that point to order_lines (which point to demand lines)
INSERT OR IGNORE INTO production_demand_links (id, production_plan_id, demand_line_id, quantity, created_at)
SELECT
  'link-ol-' || p.id || '-' || ol.demand_line_id,
  p.id,
  ol.demand_line_id,
  p.plan_qty,
  p.created_at
FROM production_plans p
JOIN order_lines ol ON p.order_line_id = ol.id
WHERE p.order_line_id IS NOT NULL
  AND ol.demand_line_id IS NOT NULL;

-- 5. Backfill shipments with demand_id and demand_line_id
UPDATE shipments
SET
  demand_id = (SELECT order_id FROM customer_order_items WHERE id = shipments.order_item_id),
  demand_line_id = shipments.order_item_id
WHERE order_item_id IS NOT NULL AND demand_line_id IS NULL;
