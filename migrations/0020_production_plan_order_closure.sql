ALTER TABLE production_plans ADD COLUMN project_id TEXT;
ALTER TABLE production_plans ADD COLUMN customer_id TEXT;
ALTER TABLE production_plans ADD COLUMN plan_qty INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_plans ADD COLUMN due_date TEXT NOT NULL DEFAULT '';
ALTER TABLE production_plans ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_production_plans_order_line
ON production_plans(order_line_id);
