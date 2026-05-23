-- Migration: split master data to customer / supplier / project / part / project-part structure.
-- project_parts is the authoritative operating master table for project + part context.

CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY NOT NULL,
  customer_name TEXT NOT NULL,
  customer_short_name TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  delivery_address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS profile_suppliers (
  supplier_id TEXT PRIMARY KEY NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_short_name TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  default_lead_time INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS parts (
  part_id TEXT PRIMARY KEY NOT NULL,
  part_name TEXT NOT NULL,
  part_number TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'PCS',
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS project_parts (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  part_id TEXT NOT NULL,
  customer_id TEXT,
  supplier_id TEXT,
  manufacturing_factory TEXT NOT NULL DEFAULT '',
  profile_material_code TEXT NOT NULL DEFAULT '',
  profile_material_name TEXT NOT NULL DEFAULT '',
  unit_usage INTEGER NOT NULL DEFAULT 1,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  warning_stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts(part_id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES profile_suppliers(supplier_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_parts_project_part
ON project_parts(project_id, part_id);

CREATE INDEX IF NOT EXISTS idx_project_parts_part
ON project_parts(part_id);

CREATE INDEX IF NOT EXISTS idx_project_parts_customer
ON project_parts(customer_id);

CREATE INDEX IF NOT EXISTS idx_project_parts_supplier
ON project_parts(supplier_id);

INSERT OR IGNORE INTO customers (
  customer_id, customer_name, customer_short_name, contact_person, status, created_at, updated_at
)
SELECT
  id,
  name,
  name,
  contact,
  status,
  created_at,
  updated_at
FROM parties
WHERE type = 'customer';

INSERT OR IGNORE INTO parts (
  part_id, part_name, part_number, unit, status, remark, created_at, updated_at
)
SELECT
  id,
  name,
  code,
  unit,
  status,
  notes,
  created_at,
  updated_at
FROM products;

INSERT OR IGNORE INTO project_parts (
  id,
  project_id,
  part_id,
  customer_id,
  supplier_id,
  manufacturing_factory,
  profile_material_code,
  profile_material_name,
  unit_usage,
  safety_stock,
  warning_stock,
  status,
  remark,
  created_at,
  updated_at
)
SELECT
  'ppart_' || lower(hex(randomblob(8))),
  p.project_id,
  p.id,
  COALESCE(p.party_id, prj.party_id),
  NULL,
  COALESCE(p.factory, ''),
  COALESCE(p.profile_code, ''),
  COALESCE(m.name, ''),
  COALESCE(pm.quantity, 1),
  0,
  0,
  p.status,
  p.notes,
  p.created_at,
  p.updated_at
FROM products p
LEFT JOIN projects prj ON prj.id = p.project_id
LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.status = 'active'
LEFT JOIN materials m ON m.id = pm.material_id
WHERE p.project_id IS NOT NULL;
