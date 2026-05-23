ALTER TABLE shipments ADD COLUMN order_item_id TEXT;

CREATE INDEX IF NOT EXISTS idx_shipments_order_item
ON shipments(order_item_id, created_at DESC);
