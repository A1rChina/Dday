PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO roles (id, code, name, description) VALUES
('role_admin', 'admin', 'System administrator', 'Full access'),
('role_planner', 'planner', 'Planner', 'Plans and work orders'),
('role_warehouse', 'warehouse', 'Warehouse', 'Inventory and shipping'),
('role_production', 'production', 'Production', 'Shop-floor execution'),
('role_quality', 'quality', 'Quality', 'Issues, defects, and freezes'),
('role_manager', 'manager', 'Manager', 'Read dashboards and reports'),
('role_operator', 'operator', 'PDA operator', 'Scan and report production'),
('role_viewer', 'viewer', 'Viewer', 'Read only');

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'raw' CHECK(type IN ('raw', 'semi_finished', 'finished', 'abnormal')),
  unit TEXT NOT NULL DEFAULT 'pcs',
  spec TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  project_name TEXT NOT NULL DEFAULT '',
  material_id TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  process_route TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  process_id TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'busy', 'maintenance', 'disabled')),
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  material_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  project_name TEXT NOT NULL DEFAULT '',
  planned_quantity INTEGER NOT NULL CHECK(planned_quantity > 0),
  completed_quantity INTEGER NOT NULL DEFAULT 0 CHECK(completed_quantity >= 0),
  defect_quantity INTEGER NOT NULL DEFAULT 0 CHECK(defect_quantity >= 0),
  scrap_quantity INTEGER NOT NULL DEFAULT 0 CHECK(scrap_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'printed', 'released', 'running', 'paused', 'completed', 'closed', 'cancelled')),
  planned_start_date TEXT NOT NULL DEFAULT '',
  planned_finish_date TEXT NOT NULL DEFAULT '',
  current_step_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  closed_at TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status
ON work_orders(status, planned_finish_date);

CREATE TABLE IF NOT EXISTS work_order_steps (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  process_id TEXT,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  planned_quantity INTEGER NOT NULL CHECK(planned_quantity > 0),
  completed_quantity INTEGER NOT NULL DEFAULT 0 CHECK(completed_quantity >= 0),
  defect_quantity INTEGER NOT NULL DEFAULT 0 CHECK(defect_quantity >= 0),
  scrap_quantity INTEGER NOT NULL DEFAULT 0 CHECK(scrap_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'blocked', 'skipped')),
  machine_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE SET NULL,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_work_order_steps_order
ON work_order_steps(work_order_id, step_order);

CREATE TABLE IF NOT EXISTS production_reports (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  process_id TEXT,
  machine_id TEXT,
  operator_name TEXT NOT NULL DEFAULT '',
  good_qty INTEGER NOT NULL DEFAULT 0 CHECK(good_qty >= 0),
  defect_qty INTEGER NOT NULL DEFAULT 0 CHECK(defect_qty >= 0),
  scrap_qty INTEGER NOT NULL DEFAULT 0 CHECK(scrap_qty >= 0),
  started_at TEXT,
  ended_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES work_order_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE SET NULL,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_production_reports_work_order
ON production_reports(work_order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_balances (
  id TEXT PRIMARY KEY,
  material_id TEXT,
  product_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  batch_no TEXT NOT NULL DEFAULT '',
  qty_available INTEGER NOT NULL DEFAULT 0,
  qty_frozen INTEGER NOT NULL DEFAULT 0,
  qty_scrap INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CHECK(material_id IS NOT NULL OR product_id IS NOT NULL),
  UNIQUE(material_id, product_id, warehouse_code, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_material
ON inventory_balances(material_id, warehouse_code, batch_no);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_product
ON inventory_balances(product_id, warehouse_code, batch_no);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  material_id TEXT,
  product_id TEXT,
  work_order_id TEXT,
  report_id TEXT,
  freeze_id TEXT,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('adjust', 'issue', 'finish', 'freeze', 'unfreeze', 'scrap', 'return', 'ship')),
  qty_delta INTEGER NOT NULL DEFAULT 0,
  frozen_delta INTEGER NOT NULL DEFAULT 0,
  scrap_delta INTEGER NOT NULL DEFAULT 0,
  qty_available_after INTEGER NOT NULL DEFAULT 0,
  qty_frozen_after INTEGER NOT NULL DEFAULT 0,
  qty_scrap_after INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (report_id) REFERENCES production_reports(id) ON DELETE SET NULL,
  FOREIGN KEY (freeze_id) REFERENCES material_freezes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created
ON inventory_movements(created_at DESC);

CREATE TABLE IF NOT EXISTS material_freezes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'confirmed', 'processing', 'released', 'scrapped', 'returned', 'closed')),
  source_type TEXT NOT NULL DEFAULT 'manual',
  project_name TEXT NOT NULL DEFAULT '',
  product_id TEXT,
  material_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  batch_no TEXT NOT NULL DEFAULT '',
  abnormal_qty INTEGER NOT NULL DEFAULT 0 CHECK(abnormal_qty >= 0),
  freeze_qty INTEGER NOT NULL CHECK(freeze_qty > 0),
  selectable_qty INTEGER NOT NULL DEFAULT 0 CHECK(selectable_qty >= 0),
  rework_qty INTEGER NOT NULL DEFAULT 0 CHECK(rework_qty >= 0),
  return_qty INTEGER NOT NULL DEFAULT 0 CHECK(return_qty >= 0),
  scrap_qty INTEGER NOT NULL DEFAULT 0 CHECK(scrap_qty >= 0),
  responsibility TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  eta TEXT NOT NULL DEFAULT '',
  impact_order TEXT NOT NULL DEFAULT '',
  impact_delivery TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  CHECK(material_id IS NOT NULL OR product_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_material_freezes_status
ON material_freezes(status, created_at DESC);

CREATE TABLE IF NOT EXISTS material_freeze_items (
  id TEXT PRIMARY KEY,
  freeze_id TEXT NOT NULL,
  material_id TEXT,
  product_id TEXT,
  batch_no TEXT NOT NULL DEFAULT '',
  freeze_qty INTEGER NOT NULL CHECK(freeze_qty > 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (freeze_id) REFERENCES material_freezes(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CHECK(material_id IS NOT NULL OR product_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity
ON attachments(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS operation_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_entity
ON operation_logs(entity_type, entity_id, created_at DESC);
