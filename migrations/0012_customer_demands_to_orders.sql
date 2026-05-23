-- Migration: 0012_customer_demands_to_orders.sql
CREATE TABLE customer_demand_lines (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  party_id TEXT NOT NULL,
  project_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE order_lines (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  demand_line_id TEXT,
  party_id TEXT NOT NULL,
  project_id TEXT,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
