ALTER TABLE quality_issues ADD COLUMN inventory_lock_id TEXT;
ALTER TABLE quality_issues ADD COLUMN handling_method TEXT NOT NULL DEFAULT '';
ALTER TABLE quality_issues ADD COLUMN warehouse_code TEXT NOT NULL DEFAULT 'MAIN';
ALTER TABLE quality_issues ADD COLUMN location_code TEXT NOT NULL DEFAULT '';
ALTER TABLE quality_issues ADD COLUMN batch_no TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS inventory_locks (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  quality_issue_id TEXT NOT NULL,
  material_id TEXT,
  product_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  location_code TEXT NOT NULL DEFAULT '',
  batch_no TEXT NOT NULL DEFAULT '',
  lock_qty INTEGER NOT NULL CHECK(lock_qty > 0),
  released_qty INTEGER NOT NULL DEFAULT 0 CHECK(released_qty >= 0),
  scrapped_qty INTEGER NOT NULL DEFAULT 0 CHECK(scrapped_qty >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'released', 'scrapped', 'returned', 'closed')),
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at TEXT,
  FOREIGN KEY (quality_issue_id) REFERENCES quality_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CHECK(material_id IS NOT NULL OR product_id IS NOT NULL),
  CHECK(material_id IS NULL OR product_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_inventory_locks_issue
ON inventory_locks(quality_issue_id);

CREATE INDEX IF NOT EXISTS idx_inventory_locks_query
ON inventory_locks(status, material_id, product_id, warehouse_code, location_code, batch_no);

CREATE TABLE IF NOT EXISTS inventory_transactions_new (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT,
  product_id TEXT,
  quality_issue_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  location_code TEXT NOT NULL DEFAULT '',
  batch_no TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('receipt', 'production_good_in', 'production_scrap', 'inventory_freeze', 'inventory_unfreeze', 'adjustment')),
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

INSERT INTO inventory_transactions_new (
  id, code, material_id, product_id, quality_issue_id, warehouse_code, location_code, batch_no,
  transaction_type, qty_delta, qty_on_hand_after, qty_frozen_after,
  qty_reserved_after, qty_available_after, source_type, source_id, source_code,
  created_by, created_at
)
SELECT
  id, code, material_id, product_id, NULL, warehouse_code, location_code, batch_no,
  transaction_type, qty_delta, qty_on_hand_after, qty_frozen_after,
  qty_reserved_after, qty_available_after, source_type, source_id, source_code,
  created_by, created_at
FROM inventory_transactions;

DROP TABLE inventory_transactions;
ALTER TABLE inventory_transactions_new RENAME TO inventory_transactions;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source
ON inventory_transactions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_quality_issue
ON inventory_transactions(quality_issue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_query
ON inventory_transactions(material_id, warehouse_code, location_code, batch_no, created_at DESC);
