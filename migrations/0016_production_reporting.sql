ALTER TABLE production_reports ADD COLUMN report_qty INTEGER NOT NULL DEFAULT 0 CHECK(report_qty >= 0);

UPDATE production_reports
SET report_qty = good_qty + defect_qty + scrap_qty
WHERE report_qty = 0;

ALTER TABLE work_orders ADD COLUMN reported_quantity INTEGER NOT NULL DEFAULT 0 CHECK(reported_quantity >= 0);
ALTER TABLE work_orders ADD COLUMN good_quantity INTEGER NOT NULL DEFAULT 0 CHECK(good_quantity >= 0);

UPDATE work_orders
SET
  reported_quantity = completed_quantity + defect_quantity + scrap_quantity,
  good_quantity = completed_quantity
WHERE reported_quantity = 0 AND good_quantity = 0;

CREATE TABLE IF NOT EXISTS inventory_transactions_new (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT,
  product_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  location_code TEXT NOT NULL DEFAULT '',
  batch_no TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('receipt', 'production_good_in', 'production_scrap')),
  qty_delta INTEGER NOT NULL,
  qty_on_hand_after INTEGER NOT NULL,
  qty_frozen_after INTEGER NOT NULL,
  qty_reserved_after INTEGER NOT NULL,
  qty_available_after INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_code TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CHECK(material_id IS NOT NULL OR product_id IS NOT NULL),
  CHECK(source_type <> '' AND source_id <> '')
);

INSERT INTO inventory_transactions_new (
  id, code, material_id, product_id, warehouse_code, location_code, batch_no,
  transaction_type, qty_delta, qty_on_hand_after, qty_frozen_after,
  qty_reserved_after, qty_available_after, source_type, source_id, source_code,
  created_by, created_at
)
SELECT
  id, code, material_id, product_id, warehouse_code, location_code, batch_no,
  transaction_type, qty_delta, qty_on_hand_after, qty_frozen_after,
  qty_reserved_after, qty_available_after, source_type, source_id, source_code,
  created_by, created_at
FROM inventory_transactions;

DROP TABLE inventory_transactions;
ALTER TABLE inventory_transactions_new RENAME TO inventory_transactions;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source
ON inventory_transactions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_query
ON inventory_transactions(material_id, warehouse_code, location_code, batch_no, created_at DESC);
