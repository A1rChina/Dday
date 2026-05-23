PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Daily',
  default_priority INTEGER NOT NULL DEFAULT 3 CHECK(default_priority BETWEEN 1 AND 5),
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS task_instances (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  work_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Daily',
  priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
  sort_order INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'doing', 'blocked', 'done', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  blocker TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_instances_template_date
ON task_instances(template_id, work_date)
WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_instances_work_date
ON task_instances(work_date, sort_order, priority);

CREATE TABLE IF NOT EXISTS task_nodes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'doing', 'blocked', 'done', 'cancelled')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  FOREIGN KEY (task_id) REFERENCES task_instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_nodes_task_id
ON task_nodes(task_id, sort_order);

CREATE TABLE IF NOT EXISTS progress_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  node_id TEXT,
  action TEXT NOT NULL,
  message TEXT DEFAULT '',
  progress_from INTEGER,
  progress_to INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_id) REFERENCES task_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES task_nodes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_progress_logs_task_id
ON progress_logs(task_id, created_at DESC);

INSERT OR IGNORE INTO task_templates
(id, title, description, category, default_priority, sort_order, is_active)
VALUES
('tpl_customer_delivery', '确认客户交付计划', '核对客户 SRM/ERP/微信变更，确认今日必须交付项与潜在延期风险。', '交付', 5, 10, 1),
('tpl_material_arrival', '确认型材到料状态', '确认材料名称、数量、发出时间、预计到厂时间和物流异常。', '物料', 5, 20, 1),
('tpl_machine_plan', '下达今日生产计划', '将计划落实到产品、数量、机台、班组、优先级和异常预案。', '生产', 4, 30, 1),
('tpl_abnormal_freeze', '检查异常物料冻结状态', '确认异常数量、可用数量、处理方案、升级人，以及是否影响交付。', '异常', 5, 40, 1),
('tpl_shipping_risk', '检查发货风险', '核对成品入库、包装、检验、客户收货窗口和运输安排。', '发货', 4, 50, 1),
('tpl_evening_review', '晚间复盘与明日风险', '整理未完成事项、阻塞点、明日重点和需要提前沟通的问题。', '复盘', 3, 90, 1);
