CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL DEFAULT 'normal',
  `status` text NOT NULL DEFAULT 'active',
  `remark` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `warehouses_code_unique` ON `warehouses` (`code`);

CREATE TABLE IF NOT EXISTS `locations` (
  `id` text PRIMARY KEY NOT NULL,
  `warehouse_code` text NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `remark` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `locations_code_unique` ON `locations` (`code`);

CREATE TABLE IF NOT EXISTS `receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `source_type` text NOT NULL DEFAULT 'manual',
  `status` text NOT NULL DEFAULT 'draft',
  `received_date` text NOT NULL,
  `notes` text NOT NULL DEFAULT '',
  `created_by` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `receipts_code_unique` ON `receipts` (`code`);

CREATE TABLE IF NOT EXISTS `receipt_items` (
  `id` text PRIMARY KEY NOT NULL,
  `receipt_id` text NOT NULL,
  `material_id` text,
  `product_id` text,
  `batch_no` text NOT NULL DEFAULT '',
  `quantity` integer NOT NULL,
  `warehouse_code` text NOT NULL,
  `location_code` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `issues` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `source_type` text NOT NULL DEFAULT 'manual',
  `status` text NOT NULL DEFAULT 'draft',
  `issued_date` text NOT NULL,
  `notes` text NOT NULL DEFAULT '',
  `created_by` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `issues_code_unique` ON `issues` (`code`);

CREATE TABLE IF NOT EXISTS `issue_items` (
  `id` text PRIMARY KEY NOT NULL,
  `issue_id` text NOT NULL,
  `material_id` text,
  `product_id` text,
  `batch_no` text NOT NULL DEFAULT '',
  `quantity` integer NOT NULL,
  `warehouse_code` text NOT NULL,
  `location_code` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `stocktakes` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `warehouse_code` text NOT NULL,
  `status` text NOT NULL DEFAULT 'draft',
  `stocktake_date` text NOT NULL,
  `notes` text NOT NULL DEFAULT '',
  `created_by` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `stocktakes_code_unique` ON `stocktakes` (`code`);

CREATE TABLE IF NOT EXISTS `stocktake_items` (
  `id` text PRIMARY KEY NOT NULL,
  `stocktake_id` text NOT NULL,
  `material_id` text,
  `product_id` text,
  `batch_no` text NOT NULL DEFAULT '',
  `system_qty` integer NOT NULL,
  `actual_qty` integer NOT NULL,
  `diff_qty` integer NOT NULL,
  `location_code` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

INSERT OR IGNORE INTO `warehouses` (`id`, `code`, `name`, `type`, `status`, `remark`, `created_at`, `updated_at`) VALUES 
('wh_main_01', 'MAIN', '主仓库', 'normal', 'active', '系统默认主仓库', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
