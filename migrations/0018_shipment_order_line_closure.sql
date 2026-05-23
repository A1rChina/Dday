ALTER TABLE order_lines ADD COLUMN delivered_qty INTEGER NOT NULL DEFAULT 0;

ALTER TABLE shipments ADD COLUMN order_line_id TEXT;
ALTER TABLE shipments ADD COLUMN product_id TEXT;
ALTER TABLE shipments ADD COLUMN warehouse_code TEXT NOT NULL DEFAULT 'MAIN';
ALTER TABLE shipments ADD COLUMN location_code TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments ADD COLUMN batch_no TEXT NOT NULL DEFAULT '';
ALTER TABLE shipments ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_shipments_order_line
ON shipments(order_line_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_lines_delivery_status
ON order_lines(status, delivered_qty);

CREATE TABLE IF NOT EXISTS inventory_transactions_v2 (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT,
  product_id TEXT,
  quality_issue_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  location_code TEXT NOT NULL DEFAULT '',
  batch_no TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('receipt', 'production_good_in', 'production_scrap', 'inventory_freeze', 'inventory_unfreeze', 'adjustment', 'shipment')),
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
  FOREIGN KEY (quality_issue_id) REFERENCES quality_issues(id) ON DELETE SET NULL,
  CHECK(material_id IS NOT NULL OR product_id IS NOT NULL),
  CHECK(source_type <> '' AND source_id <> '')
);

INSERT INTO inventory_transactions_v2 (
  id, code, material_id, product_id, quality_issue_id, warehouse_code, location_code, batch_no,
  transaction_type, qty_delta, qty_on_hand_after, qty_frozen_after,
  qty_reserved_after, qty_available_after, source_type, source_id, source_code, created_by, created_at
)
SELECT
  id, code, material_id, product_id, quality_issue_id, warehouse_code, location_code, batch_no,
  transaction_type, qty_delta, qty_on_hand_after, qty_frozen_after,
  qty_reserved_after, qty_available_after, source_type, source_id, source_code, created_by, created_at
FROM inventory_transactions;

DROP TABLE inventory_transactions;
ALTER TABLE inventory_transactions_v2 RENAME TO inventory_transactions;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source
ON inventory_transactions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_query
ON inventory_transactions(material_id, warehouse_code, location_code, batch_no, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_quality_issue
ON inventory_transactions(quality_issue_id, created_at DESC);
