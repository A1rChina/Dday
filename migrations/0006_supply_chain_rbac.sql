PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (role_code, permission_code),
  FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE CASCADE,
  FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
);

INSERT OR IGNORE INTO permissions (id, code, module, action, description) VALUES
('perm_supply_read', 'supply:read', 'supply', 'read', 'Read supply-chain flow'),
('perm_order_import', 'order:import', 'order', 'import', 'Import customer orders and demand versions'),
('perm_order_update', 'order:update', 'order', 'update', 'Update customer orders'),
('perm_receipt_create', 'receipt:create', 'receipt', 'create', 'Receive material into inventory'),
('perm_plan_manage', 'plan:manage', 'plan', 'manage', 'Create and release production plans'),
('perm_work_order_manage', 'work_order:manage', 'work_order', 'manage', 'Create, release, and close work orders'),
('perm_report_create', 'report:create', 'report', 'create', 'Submit production reports'),
('perm_inventory_manage', 'inventory:manage', 'inventory', 'manage', 'Adjust, freeze, and unfreeze inventory'),
('perm_quality_manage', 'quality:manage', 'quality', 'manage', 'Create and process quality issues'),
('perm_delivery_manage', 'delivery:manage', 'delivery', 'manage', 'Plan and confirm deliveries'),
('perm_permission_read', 'permission:read', 'permission', 'read', 'Read roles and permission matrix'),
('perm_admin_all', '*', 'admin', '*', 'Full access');

INSERT OR IGNORE INTO role_permissions (role_code, permission_code) VALUES
('admin', '*'),
('manager', 'supply:read'),
('manager', 'permission:read'),
('manager', 'order:update'),
('manager', 'plan:manage'),
('manager', 'delivery:manage'),
('planner', 'supply:read'),
('planner', 'order:import'),
('planner', 'order:update'),
('planner', 'plan:manage'),
('planner', 'work_order:manage'),
('planner', 'delivery:manage'),
('warehouse', 'supply:read'),
('warehouse', 'receipt:create'),
('warehouse', 'inventory:manage'),
('warehouse', 'delivery:manage'),
('production', 'supply:read'),
('production', 'work_order:manage'),
('production', 'report:create'),
('quality', 'supply:read'),
('quality', 'quality:manage'),
('quality', 'inventory:manage'),
('operator', 'report:create'),
('operator', 'supply:read'),
('viewer', 'supply:read'),
('viewer', 'permission:read');

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS customer_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_file_name TEXT NOT NULL DEFAULT '',
  demand_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'imported' CHECK(status IN ('imported', 'confirmed', 'planned', 'in_production', 'ready_to_ship', 'shipped', 'closed', 'cancelled')),
  requested_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_orders_status
ON customer_orders(status, requested_date);

CREATE TABLE IF NOT EXISTS customer_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  demand_version INTEGER NOT NULL DEFAULT 1,
  product_id TEXT,
  product_code TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  material_id TEXT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  delivered_quantity INTEGER NOT NULL DEFAULT 0 CHECK(delivered_quantity >= 0),
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'planned', 'in_production', 'ready_to_ship', 'shipped', 'closed', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_order_items_order
ON customer_order_items(order_id, status);

CREATE TABLE IF NOT EXISTS demand_plan_versions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  imported_by TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  raw_payload TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,
  UNIQUE(order_id, version)
);

CREATE TABLE IF NOT EXISTS material_receipts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  material_id TEXT NOT NULL,
  order_item_id TEXT,
  supplier_name TEXT NOT NULL DEFAULT '',
  warehouse_code TEXT NOT NULL DEFAULT 'MAIN',
  batch_no TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('planned', 'received', 'inspecting', 'accepted', 'rejected', 'returned')),
  received_by TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_item_id) REFERENCES customer_order_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS production_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  plan_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'released', 'running', 'blocked', 'completed', 'cancelled')),
  created_by TEXT NOT NULL DEFAULT '',
  released_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_production_plans_status
ON production_plans(status, plan_date);

CREATE TABLE IF NOT EXISTS production_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  order_item_id TEXT,
  product_id TEXT NOT NULL,
  material_id TEXT,
  planned_quantity INTEGER NOT NULL CHECK(planned_quantity > 0),
  machine_id TEXT,
  planned_start_date TEXT NOT NULL DEFAULT '',
  planned_finish_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'released', 'work_order_created', 'running', 'completed', 'blocked', 'cancelled')),
  work_order_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (plan_id) REFERENCES production_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES customer_order_items(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_production_plan_items_plan
ON production_plan_items(plan_id, status);

CREATE TABLE IF NOT EXISTS delivery_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  order_id TEXT,
  planned_ship_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'blocked', 'shipped', 'closed', 'cancelled')),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK(risk_level IN ('low', 'medium', 'high')),
  risk_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS delivery_plan_items (
  id TEXT PRIMARY KEY,
  delivery_plan_id TEXT NOT NULL,
  order_item_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  batch_no TEXT NOT NULL DEFAULT '',
  risk_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (delivery_plan_id) REFERENCES delivery_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES customer_order_items(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  delivery_plan_id TEXT,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'confirmed', 'cancelled')),
  shipped_at TEXT,
  confirmed_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (delivery_plan_id) REFERENCES delivery_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  order_item_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  batch_no TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES customer_order_items(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS quality_issues (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL DEFAULT '',
  order_id TEXT,
  order_item_id TEXT,
  work_order_id TEXT,
  material_id TEXT,
  product_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'confirmed', 'processing', 'frozen', 'resolved', 'closed')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  freeze_id TEXT,
  owner TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at TEXT,
  FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (order_item_id) REFERENCES customer_order_items(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (freeze_id) REFERENCES material_freezes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS issue_actions (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (issue_id) REFERENCES quality_issues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supply_chain_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_supply_chain_events_order
ON supply_chain_events(order_id, created_at DESC);
