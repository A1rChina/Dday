CREATE TABLE IF NOT EXISTS material_delivery_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  planned_ship_at TEXT NOT NULL DEFAULT '',
  estimated_arrival_at TEXT NOT NULL DEFAULT '',
  actual_arrival_at TEXT NOT NULL DEFAULT '',
  logistics_tracking_no TEXT NOT NULL DEFAULT '',
  vehicle_info TEXT NOT NULL DEFAULT '',
  delay_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'shipped', 'arrived', 'delayed', 'abnormal', 'closed')),
  created_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_material_delivery_plans_status
ON material_delivery_plans(status, estimated_arrival_at);

CREATE INDEX IF NOT EXISTS idx_material_delivery_plans_material
ON material_delivery_plans(material_id, created_at DESC);

CREATE TABLE IF NOT EXISTS warehouse_receipts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_delivery_plan_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL DEFAULT '',
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  batch_no TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  received_at TEXT NOT NULL DEFAULT '',
  received_by TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'closed')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_delivery_plan_id) REFERENCES material_delivery_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_warehouse_receipts_plan
ON warehouse_receipts(material_delivery_plan_id, created_at DESC);
