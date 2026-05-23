PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS process_cards (
  id TEXT PRIMARY KEY,
  card_code TEXT NOT NULL UNIQUE,
  production_order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL DEFAULT '',
  product_code TEXT NOT NULL DEFAULT '',
  drawing_no TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'pcs',
  card_qty INTEGER NOT NULL CHECK(card_qty > 0),
  current_operation_id TEXT,
  current_operation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'running', 'abnormal', 'completed', 'void')),
  printed_at TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  process_hint TEXT NOT NULL DEFAULT '',
  special_remarks TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  voided_at TEXT,
  FOREIGN KEY (production_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_process_cards_order
ON process_cards(production_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_process_cards_status
ON process_cards(status, current_operation);

CREATE TABLE IF NOT EXISTS route_operations (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  operation_id TEXT,
  operation_code TEXT NOT NULL DEFAULT '',
  operation_name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  planned_qty INTEGER NOT NULL CHECK(planned_qty > 0),
  good_qty INTEGER NOT NULL DEFAULT 0 CHECK(good_qty >= 0),
  defect_qty INTEGER NOT NULL DEFAULT 0 CHECK(defect_qty >= 0),
  scrap_qty INTEGER NOT NULL DEFAULT 0 CHECK(scrap_qty >= 0),
  rework_qty INTEGER NOT NULL DEFAULT 0 CHECK(rework_qty >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'blocked', 'skipped')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (card_id) REFERENCES process_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (operation_id) REFERENCES processes(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_route_operations_card_seq
ON route_operations(card_id, sequence);

CREATE TABLE IF NOT EXISTS operation_reports (
  id TEXT PRIMARY KEY,
  report_no TEXT NOT NULL UNIQUE,
  card_id TEXT NOT NULL,
  card_code TEXT NOT NULL,
  production_order_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK(report_type IN ('scan', 'manual')),
  good_qty INTEGER NOT NULL DEFAULT 0 CHECK(good_qty >= 0),
  defect_qty INTEGER NOT NULL DEFAULT 0 CHECK(defect_qty >= 0),
  scrap_qty INTEGER NOT NULL DEFAULT 0 CHECK(scrap_qty >= 0),
  rework_qty INTEGER NOT NULL DEFAULT 0 CHECK(rework_qty >= 0),
  operator TEXT NOT NULL DEFAULT '',
  inspector TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  defect_reason TEXT NOT NULL DEFAULT '',
  manual_reason TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (card_id) REFERENCES process_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (operation_id) REFERENCES route_operations(id) ON DELETE CASCADE,
  FOREIGN KEY (production_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_operation_reports_query
ON operation_reports(created_at DESC, production_order_id, operation_name, operator);

CREATE TABLE IF NOT EXISTS quality_abnormal_records (
  id TEXT PRIMARY KEY,
  abnormal_no TEXT NOT NULL UNIQUE,
  card_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  card_code TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  abnormal_type TEXT NOT NULL CHECK(abnormal_type IN ('defect', 'scrap', 'rework')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'processing', 'closed')),
  handling_method TEXT NOT NULL DEFAULT '',
  handled_by TEXT NOT NULL DEFAULT '',
  handled_at TEXT,
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (card_id) REFERENCES process_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES operation_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (operation_id) REFERENCES route_operations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quality_abnormal_records_status
ON quality_abnormal_records(status, created_at DESC);

CREATE TABLE IF NOT EXISTS wip_transactions (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  report_id TEXT,
  card_code TEXT NOT NULL,
  operation_id TEXT,
  operation_name TEXT NOT NULL DEFAULT '',
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('report_good', 'report_defect', 'report_scrap', 'report_rework', 'move_next', 'complete', 'void')),
  qty_delta INTEGER NOT NULL DEFAULT 0,
  qty_after INTEGER NOT NULL DEFAULT 0,
  from_operation TEXT NOT NULL DEFAULT '',
  to_operation TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (card_id) REFERENCES process_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES operation_reports(id) ON DELETE SET NULL,
  FOREIGN KEY (operation_id) REFERENCES route_operations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wip_transactions_card
ON wip_transactions(card_id, created_at DESC);
