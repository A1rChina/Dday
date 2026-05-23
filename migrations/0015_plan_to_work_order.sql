ALTER TABLE production_plans ADD COLUMN order_line_id TEXT;
ALTER TABLE production_plans ADD COLUMN product_id TEXT;
ALTER TABLE production_plans ADD COLUMN material_id TEXT;
ALTER TABLE production_plans ADD COLUMN planned_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_plans ADD COLUMN planned_start_at TEXT NOT NULL DEFAULT '';
ALTER TABLE production_plans ADD COLUMN planned_finish_at TEXT NOT NULL DEFAULT '';
ALTER TABLE production_plans ADD COLUMN material_ready_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE production_plans ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE work_orders ADD COLUMN production_plan_id TEXT;
ALTER TABLE work_orders ADD COLUMN order_line_id TEXT;

CREATE TABLE IF NOT EXISTS work_resources (
  id TEXT PRIMARY KEY,
  production_plan_id TEXT,
  work_order_id TEXT,
  process_id TEXT,
  machine_id TEXT,
  planned_start_at TEXT NOT NULL DEFAULT '',
  planned_finish_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (production_plan_id) REFERENCES production_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE SET NULL,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_work_resources_plan
ON work_resources(production_plan_id, status);

CREATE INDEX IF NOT EXISTS idx_work_resources_order
ON work_resources(work_order_id, status);
