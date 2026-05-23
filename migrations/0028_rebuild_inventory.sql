DROP TABLE IF EXISTS `inventory_balances`;
DROP TABLE IF EXISTS `inventory_transactions`;
DROP TABLE IF EXISTS `receipt_items`;
DROP TABLE IF EXISTS `issue_items`;
DROP TABLE IF EXISTS `stocktake_items`;

CREATE TABLE IF NOT EXISTS `inventory_balances` (
  `id` text PRIMARY KEY NOT NULL,
  `item_id` text NOT NULL,
  `item_code` text NOT NULL DEFAULT '',
  `item_name` text NOT NULL DEFAULT '',
  `item_type` text NOT NULL DEFAULT '',
  `project_id` text,
  `project_code` text NOT NULL DEFAULT '',
  `customer_id` text,
  `customer_name` text NOT NULL DEFAULT '',
  `warehouse_id` text,
  `warehouse_name` text NOT NULL DEFAULT '',
  `location_id` text,
  `location_code` text NOT NULL DEFAULT '',
  `inventory_status` text NOT NULL DEFAULT 'available',
  `quantity` integer NOT NULL DEFAULT 0,
  `unit` text NOT NULL DEFAULT 'pcs',
  `source_no` text NOT NULL DEFAULT '',
  `last_transaction_at` text,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` text PRIMARY KEY NOT NULL,
  `transaction_no` text NOT NULL,
  `item_id` text NOT NULL,
  `item_code` text NOT NULL DEFAULT '',
  `item_name` text NOT NULL DEFAULT '',
  `item_type` text NOT NULL DEFAULT '',
  `project_id` text,
  `project_code` text NOT NULL DEFAULT '',
  `customer_id` text,
  `customer_name` text NOT NULL DEFAULT '',
  `warehouse_id` text,
  `warehouse_name` text NOT NULL DEFAULT '',
  `location_id` text,
  `location_code` text NOT NULL DEFAULT '',
  `transaction_type` text NOT NULL,
  `quantity_change` integer NOT NULL,
  `before_quantity` integer NOT NULL DEFAULT 0,
  `after_quantity` integer NOT NULL DEFAULT 0,
  `from_status` text NOT NULL DEFAULT '',
  `to_status` text NOT NULL DEFAULT '',
  `source_type` text NOT NULL,
  `source_id` text NOT NULL,
  `source_no` text NOT NULL DEFAULT '',
  `operator_id` text NOT NULL DEFAULT '',
  `operator_name` text NOT NULL DEFAULT '',
  `occurred_at` text NOT NULL,
  `remark` text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS `receipt_items` (
  `id` text PRIMARY KEY NOT NULL,
  `receipt_id` text NOT NULL,
  `item_id` text NOT NULL,
  `project_id` text,
  `batch_no` text NOT NULL DEFAULT '',
  `quantity` integer NOT NULL,
  `warehouse_id` text,
  `location_id` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `issue_items` (
  `id` text PRIMARY KEY NOT NULL,
  `issue_id` text NOT NULL,
  `item_id` text NOT NULL,
  `project_id` text,
  `batch_no` text NOT NULL DEFAULT '',
  `quantity` integer NOT NULL,
  `warehouse_id` text,
  `location_id` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `stocktake_items` (
  `id` text PRIMARY KEY NOT NULL,
  `stocktake_id` text NOT NULL,
  `item_id` text NOT NULL,
  `project_id` text,
  `batch_no` text NOT NULL DEFAULT '',
  `system_qty` integer NOT NULL,
  `actual_qty` integer NOT NULL,
  `diff_qty` integer NOT NULL,
  `location_id` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
