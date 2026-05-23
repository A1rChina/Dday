PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS production_week_plans (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  week INTEGER NOT NULL CHECK(week BETWEEN 1 AND 53),
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  source_file_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(year, week)
);

CREATE INDEX IF NOT EXISTS idx_production_week_plans_year_week
ON production_week_plans(year, week);

CREATE TABLE IF NOT EXISTS production_week_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  row_key TEXT NOT NULL,
  work_date TEXT NOT NULL,
  product TEXT NOT NULL,
  order_no TEXT NOT NULL DEFAULT '',
  quantity TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  machine TEXT NOT NULL DEFAULT '',
  shift TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 4 CHECK(priority BETWEEN 1 AND 5),
  notes TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  row_number INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (plan_id) REFERENCES production_week_plans(id) ON DELETE CASCADE,
  UNIQUE(plan_id, row_key)
);

CREATE INDEX IF NOT EXISTS idx_production_week_plan_items_plan
ON production_week_plan_items(plan_id, is_active, work_date);
