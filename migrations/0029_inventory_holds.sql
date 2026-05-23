DROP TABLE IF EXISTS inventory_locks;
DROP TABLE IF EXISTS inventory_movements;

ALTER TABLE inventory_balances ADD COLUMN created_at text NOT NULL DEFAULT '';
ALTER TABLE inventory_transactions ADD COLUMN created_at text NOT NULL DEFAULT '';

CREATE TABLE inventory_holds (
  id text PRIMARY KEY,
  hold_no text NOT NULL,
  item_id text NOT NULL,
  item_code text NOT NULL DEFAULT '',
  item_name text NOT NULL DEFAULT '',
  project_id text,
  project_code text NOT NULL DEFAULT '',
  customer_id text,
  customer_name text NOT NULL DEFAULT '',
  warehouse_id text NOT NULL,
  warehouse_name text NOT NULL DEFAULT '',
  location_id text,
  location_code text NOT NULL DEFAULT '',
  hold_quantity integer NOT NULL,
  processed_quantity integer NOT NULL DEFAULT 0,
  remaining_quantity integer NOT NULL,
  abnormal_type text NOT NULL DEFAULT '',
  discovery_stage text NOT NULL DEFAULT '',
  responsible_party text NOT NULL DEFAULT '',
  handling_plan text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  initiator_id text NOT NULL DEFAULT '',
  handler_id text NOT NULL DEFAULT '',
  found_at text,
  expected_close_at text,
  is_delivery_affected integer NOT NULL DEFAULT 0,
  remark text NOT NULL DEFAULT '',
  created_at text NOT NULL,
  updated_at text NOT NULL
);
