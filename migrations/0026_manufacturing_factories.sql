CREATE TABLE IF NOT EXISTS manufacturing_factories (
  factory_id TEXT PRIMARY KEY NOT NULL,
  factory_name TEXT NOT NULL,
  factory_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO manufacturing_factories (
  factory_id, factory_name, factory_code, status, remark, created_at, updated_at
)
SELECT
  'fac_' || lower(hex(randomblob(8))),
  manufacturing_factory,
  manufacturing_factory,
  'active',
  'Migrated from project_parts',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
  SELECT DISTINCT manufacturing_factory
  FROM project_parts
  WHERE manufacturing_factory IS NOT NULL AND manufacturing_factory != ''
) f
WHERE NOT EXISTS (
  SELECT 1 FROM manufacturing_factories mf WHERE mf.factory_name = f.manufacturing_factory
);

INSERT OR IGNORE INTO manufacturing_factories (
  factory_id, factory_name, factory_code, status, remark, created_at, updated_at
)
SELECT
  'fac_' || lower(hex(randomblob(8))),
  factory,
  factory,
  'active',
  'Migrated from products',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
  SELECT DISTINCT factory
  FROM products
  WHERE factory IS NOT NULL AND factory != ''
) f
WHERE NOT EXISTS (
  SELECT 1 FROM manufacturing_factories mf WHERE mf.factory_name = f.factory
);

INSERT OR IGNORE INTO manufacturing_factories (
  factory_id, factory_name, factory_code, status, remark, created_at, updated_at
) VALUES
('fac_yibin', '宜宾', 'YB', 'active', 'Default factory', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('fac_chongqing', '重庆', 'CQ', 'active', 'Default factory', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('fac_outsource', '外协', 'OUTSOURCE', 'active', 'Default factory', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
