-- Refactor Master Data: Parties, Projects, Products, Materials, Product Materials, Users, Attachments

-- Temporarily turn off foreign keys to allow table recreation
PRAGMA foreign_keys = OFF;

-- 1. Rename customers to parties, add type and status, and map existing data
ALTER TABLE customers RENAME TO parties;
ALTER TABLE parties ADD COLUMN type TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE parties ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

UPDATE parties SET status = 'active' WHERE is_active = 1;
UPDATE parties SET status = 'inactive' WHERE is_active = 0;
ALTER TABLE parties DROP COLUMN is_active;

-- 2. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  party_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
);

-- 3. Populate projects with unique project_name & customer_name from products
INSERT INTO projects (id, code, name, party_id, status, notes, created_at, updated_at)
SELECT 
  'proj_' || lower(hex(randomblob(8))) AS id,
  'PROJ-' || upper(replace(replace(p.project_name, ' ', '-'), '_', '-')) AS code,
  p.project_name AS name,
  pt.id AS party_id,
  'active' AS status,
  'Migrated from products' AS notes,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS created_at,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS updated_at
FROM (SELECT DISTINCT project_name, customer_name FROM products WHERE project_name != '') p
LEFT JOIN parties pt ON pt.name = p.customer_name;

-- 4. Create product_materials table (BOM many-to-many)
CREATE TABLE IF NOT EXISTS product_materials (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- 5. Populate product_materials using products.material_id before we recreate products table
INSERT INTO product_materials (id, product_id, material_id, quantity, status, created_at, updated_at)
SELECT 
  'pm_' || lower(hex(randomblob(8))) AS id,
  id AS product_id,
  material_id,
  1.0 AS quantity,
  'active' AS status,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS created_at,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS updated_at
FROM products 
WHERE material_id IS NOT NULL AND material_id != '';

-- 6. Create products_new table with project_id and party_id, and without material_id/customer_name/project_name/is_active
CREATE TABLE products_new (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  process_route TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  project_id TEXT,
  party_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
);

-- 7. Populate products_new from products, mapping customer_name and project_name to their foreign keys
INSERT INTO products_new (id, code, name, unit, process_route, notes, status, created_at, updated_at, party_id, project_id)
SELECT 
  p.id,
  p.code,
  p.name,
  p.unit,
  p.process_route,
  p.notes,
  CASE WHEN p.is_active = 1 THEN 'active' ELSE 'inactive' END AS status,
  p.created_at,
  p.updated_at,
  pt.id AS party_id,
  pj.id AS project_id
FROM products p
LEFT JOIN parties pt ON pt.name = p.customer_name
LEFT JOIN projects pj ON pj.name = p.project_name;

-- 8. Drop original products table and rename products_new to products
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

-- 9. Alter materials table to convert is_active to status
ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
UPDATE materials SET status = 'active' WHERE is_active = 1;
UPDATE materials SET status = 'inactive' WHERE is_active = 0;
ALTER TABLE materials DROP COLUMN is_active;

-- 10. Alter users table to convert is_active to status
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
UPDATE users SET status = 'active' WHERE is_active = 1;
UPDATE users SET status = 'inactive' WHERE is_active = 0;
ALTER TABLE users DROP COLUMN is_active;

-- 11. Alter attachments table to add updated_at and status
ALTER TABLE attachments ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
ALTER TABLE attachments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Re-enable foreign key checking
PRAGMA foreign_keys = ON;
