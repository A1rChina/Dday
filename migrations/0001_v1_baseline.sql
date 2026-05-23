CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'active',
  password_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_code TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE operation_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  customer_code TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL,
  customer_short_name TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  delivery_address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE profile_suppliers (
  supplier_id TEXT PRIMARY KEY,
  supplier_code TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL,
  supplier_short_name TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  default_lead_time INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE manufacturing_factories (
  factory_id TEXT PRIMARY KEY,
  factory_name TEXT NOT NULL,
  factory_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'PCS',
  process_route TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  project_id TEXT,
  project_code TEXT NOT NULL DEFAULT '',
  factory_id TEXT NOT NULL DEFAULT '',
  drawing_no TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'profile',
  unit TEXT NOT NULL DEFAULT 'pcs',
  spec TEXT NOT NULL DEFAULT '',
  supplier_id TEXT,
  material_category TEXT NOT NULL DEFAULT '',
  default_lead_time INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE product_materials (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  usage_unit TEXT NOT NULL DEFAULT 'pcs',
  loss_rate REAL NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  process_id TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE customer_demands (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  customer_id TEXT NOT NULL DEFAULT '',
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

CREATE TABLE demand_lines (
  id TEXT PRIMARY KEY,
  demand_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  project_code TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  product_code TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual',
  quantity INTEGER NOT NULL,
  required_quantity INTEGER NOT NULL DEFAULT 0,
  planned_quantity INTEGER NOT NULL DEFAULT 0,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  shipped_quantity INTEGER NOT NULL DEFAULT 0,
  delivered_quantity INTEGER NOT NULL DEFAULT 0,
  unshipped_quantity INTEGER NOT NULL DEFAULT 0,
  cancelled_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'imported',
  due_date TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  source_line_no TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE demand_plan_versions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  imported_by TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  raw_payload TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE production_demand_links (
  id TEXT PRIMARY KEY,
  production_plan_id TEXT NOT NULL,
  demand_line_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE production_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  plan_date TEXT NOT NULL,
  project_id TEXT,
  project_code TEXT NOT NULL DEFAULT '',
  customer_id TEXT,
  product_id TEXT NOT NULL,
  product_code TEXT NOT NULL DEFAULT '',
  material_id TEXT,
  material_code TEXT NOT NULL DEFAULT '',
  factory_id TEXT NOT NULL DEFAULT '',
  plan_type TEXT NOT NULL DEFAULT 'normal',
  plan_qty INTEGER NOT NULL DEFAULT 0,
  planned_quantity INTEGER NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  planned_start_at TEXT NOT NULL DEFAULT '',
  planned_finish_at TEXT NOT NULL DEFAULT '',
  material_ready_status TEXT NOT NULL DEFAULT 'unknown',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL DEFAULT '',
  released_at TEXT,
  locked_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE production_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  demand_line_id TEXT,
  product_id TEXT NOT NULL,
  material_id TEXT,
  planned_quantity INTEGER NOT NULL,
  machine_id TEXT,
  planned_start_date TEXT NOT NULL DEFAULT '',
  planned_finish_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  work_order_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  production_plan_id TEXT,
  product_id TEXT NOT NULL,
  material_id TEXT,
  factory_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  project_name TEXT NOT NULL DEFAULT '',
  planned_quantity INTEGER NOT NULL DEFAULT 0,
  reported_quantity INTEGER NOT NULL DEFAULT 0,
  good_quantity INTEGER NOT NULL DEFAULT 0,
  completed_quantity INTEGER NOT NULL DEFAULT 0,
  defect_quantity INTEGER NOT NULL DEFAULT 0,
  scrap_quantity INTEGER NOT NULL DEFAULT 0,
  process_route_snapshot TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'created',
  planned_start_date TEXT NOT NULL DEFAULT '',
  planned_finish_date TEXT NOT NULL DEFAULT '',
  current_step_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  released_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  closed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE work_order_steps (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  process_id TEXT NOT NULL DEFAULT '',
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  planned_quantity INTEGER NOT NULL,
  completed_quantity INTEGER NOT NULL DEFAULT 0,
  defect_quantity INTEGER NOT NULL DEFAULT 0,
  scrap_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  machine_id TEXT,
  process_code TEXT NOT NULL DEFAULT '',
  machine_code TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  quality_required INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE process_cards (
  id TEXT PRIMARY KEY,
  card_code TEXT NOT NULL UNIQUE,
  work_order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL DEFAULT '',
  product_code TEXT NOT NULL DEFAULT '',
  drawing_no TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'pcs',
  card_qty INTEGER NOT NULL,
  current_operation_id TEXT,
  current_operation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'created',
  printed_at TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  process_hint TEXT NOT NULL DEFAULT '',
  special_remarks TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  voided_at TEXT
);

CREATE TABLE operation_reports (
  id TEXT PRIMARY KEY,
  report_no TEXT NOT NULL UNIQUE,
  card_id TEXT,
  card_code TEXT NOT NULL DEFAULT '',
  work_order_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  good_qty INTEGER NOT NULL DEFAULT 0,
  defect_qty INTEGER NOT NULL DEFAULT 0,
  scrap_qty INTEGER NOT NULL DEFAULT 0,
  rework_qty INTEGER NOT NULL DEFAULT 0,
  operator TEXT NOT NULL DEFAULT '',
  inspector TEXT NOT NULL DEFAULT '',
  machine_id TEXT,
  defect_reason TEXT NOT NULL DEFAULT '',
  manual_reason TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE wip_transactions (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  report_id TEXT,
  card_code TEXT NOT NULL,
  operation_id TEXT,
  operation_name TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL,
  qty_delta INTEGER NOT NULL DEFAULT 0,
  qty_after INTEGER NOT NULL DEFAULT 0,
  from_operation TEXT NOT NULL DEFAULT '',
  to_operation TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE work_resources (
  id TEXT PRIMARY KEY,
  production_plan_id TEXT,
  work_order_id TEXT,
  process_id TEXT,
  machine_id TEXT,
  planned_start_at TEXT NOT NULL DEFAULT '',
  planned_finish_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal',
  factory_id TEXT NOT NULL DEFAULT '',
  is_virtual INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  warehouse_id TEXT NOT NULL DEFAULT '',
  warehouse_code TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE inventory_balances (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  item_type TEXT NOT NULL DEFAULT 'material',
  project_id TEXT,
  project_code TEXT NOT NULL DEFAULT '',
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT NOT NULL DEFAULT '',
  location_id TEXT,
  location_code TEXT NOT NULL DEFAULT '',
  inventory_status TEXT NOT NULL DEFAULT 'available',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  source_no TEXT NOT NULL DEFAULT '',
  last_transaction_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  transaction_no TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  item_type TEXT NOT NULL DEFAULT 'material',
  project_id TEXT,
  project_code TEXT NOT NULL DEFAULT '',
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT NOT NULL DEFAULT '',
  location_id TEXT,
  location_code TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  before_quantity INTEGER NOT NULL DEFAULT 0,
  after_quantity INTEGER NOT NULL DEFAULT 0,
  from_status TEXT NOT NULL DEFAULT '',
  to_status TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_no TEXT NOT NULL DEFAULT '',
  operator_id TEXT NOT NULL DEFAULT '',
  operator_name TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL,
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE inventory_holds (
  id TEXT PRIMARY KEY,
  hold_no TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  project_id TEXT,
  project_code TEXT NOT NULL DEFAULT '',
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT NOT NULL DEFAULT '',
  location_id TEXT,
  location_code TEXT NOT NULL DEFAULT '',
  hold_quantity INTEGER NOT NULL,
  processed_quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL,
  abnormal_type TEXT NOT NULL DEFAULT '',
  discovery_stage TEXT NOT NULL DEFAULT '',
  responsible_party TEXT NOT NULL DEFAULT '',
  handling_plan TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  initiator_id TEXT NOT NULL DEFAULT '',
  handler_id TEXT NOT NULL DEFAULT '',
  found_at TEXT,
  expected_close_at TEXT,
  is_delivery_affected INTEGER NOT NULL DEFAULT 0,
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE material_delivery_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL DEFAULT '',
  supplier_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL,
  planned_ship_at TEXT NOT NULL DEFAULT '',
  estimated_arrival_at TEXT NOT NULL DEFAULT '',
  actual_arrival_at TEXT NOT NULL DEFAULT '',
  logistics_tracking_no TEXT NOT NULL DEFAULT '',
  vehicle_info TEXT NOT NULL DEFAULT '',
  delay_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  source_no TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  received_date TEXT NOT NULL,
  confirmed_at TEXT,
  confirmed_by TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE receipt_items (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'material',
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  project_id TEXT,
  batch_no TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  warehouse_id TEXT NOT NULL,
  location_id TEXT,
  inventory_status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  source_no TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_date TEXT NOT NULL,
  confirmed_at TEXT,
  confirmed_by TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE issue_items (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'material',
  item_code TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  project_id TEXT,
  batch_no TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  warehouse_id TEXT NOT NULL,
  location_id TEXT,
  inventory_status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE stocktakes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  warehouse_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  stocktake_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE stocktake_items (
  id TEXT PRIMARY KEY,
  stocktake_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  project_id TEXT,
  batch_no TEXT NOT NULL DEFAULT '',
  system_qty INTEGER NOT NULL,
  actual_qty INTEGER NOT NULL,
  diff_qty INTEGER NOT NULL,
  location_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE quality_issues (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL DEFAULT '',
  work_order_id TEXT,
  material_id TEXT,
  product_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  inventory_lock_id TEXT,
  handling_method TEXT NOT NULL DEFAULT '',
  warehouse_code TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT,
  location_code TEXT NOT NULL DEFAULT '',
  location_id TEXT,
  batch_no TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE issue_actions (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  related_transaction_id TEXT,
  related_hold_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE delivery_plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  demand_id TEXT,
  planned_ship_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  risk_level TEXT NOT NULL DEFAULT 'low',
  risk_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE delivery_plan_items (
  id TEXT PRIMARY KEY,
  delivery_plan_id TEXT NOT NULL,
  demand_line_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  batch_no TEXT NOT NULL DEFAULT '',
  risk_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  delivery_plan_id TEXT,
  demand_id TEXT,
  demand_line_id TEXT,
  product_id TEXT,
  warehouse_code TEXT NOT NULL DEFAULT '',
  location_code TEXT NOT NULL DEFAULT '',
  batch_no TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created',
  shipped_at TEXT,
  confirmed_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  demand_line_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  batch_no TEXT NOT NULL DEFAULT '',
  warehouse_id TEXT,
  location_id TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  product_code TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE supply_chain_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
