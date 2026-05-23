ALTER TABLE inventory_balances ADD COLUMN location_code TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_balances ADD COLUMN qty_on_hand INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_balances ADD COLUMN qty_reserved INTEGER NOT NULL DEFAULT 0;

UPDATE inventory_balances
SET
  qty_on_hand = qty_available + qty_frozen,
  qty_reserved = 0,
  qty_available = (qty_available + qty_frozen) - qty_frozen - 0
WHERE qty_on_hand = 0;

CREATE INDEX IF NOT EXISTS idx_inventory_balances_ledger_query
ON inventory_balances(material_id, warehouse_code, location_code, batch_no);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT,
  product_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  location_code TEXT NOT NULL DEFAULT '',
  batch_no TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('receipt')),
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

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source
ON inventory_transactions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_query
ON inventory_transactions(material_id, warehouse_code, location_code, batch_no, created_at DESC);
