PRAGMA foreign_keys = ON;

INSERT INTO task_templates
(id, title, description, category, default_priority, sort_order, is_active)
VALUES
('tpl_customer_delivery', '确认客户交付计划', '核对客户 SRM/ERP/微信变更，确认今日必须交付项与潜在延期风险。', '交付', 5, 10, 1),
('tpl_material_arrival', '确认型材到料状态', '确认材料名称、数量、发出时间、预计到厂时间和物流异常。', '物料', 5, 20, 1),
('tpl_machine_plan', '下达今日生产计划', '将计划落实到产品、数量、机台、班组、优先级和异常预案。', '生产', 4, 30, 1),
('tpl_abnormal_freeze', '检查异常物料冻结状态', '确认异常数量、可用数量、处理方案、升级人，以及是否影响交付。', '异常', 5, 40, 1),
('tpl_shipping_risk', '检查发货风险', '核对成品入库、包装、检验、客户收货窗口和运输安排。', '发货', 4, 50, 1),
('tpl_evening_review', '晚间复盘与明日风险', '整理未完成事项、阻塞点、明日重点和需要提前沟通的问题。', '复盘', 3, 90, 1)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  default_priority = excluded.default_priority,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

UPDATE task_instances
SET
  title = (SELECT title FROM task_templates WHERE task_templates.id = task_instances.template_id),
  description = (SELECT description FROM task_templates WHERE task_templates.id = task_instances.template_id),
  category = (SELECT category FROM task_templates WHERE task_templates.id = task_instances.template_id),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE template_id IN (
  'tpl_customer_delivery',
  'tpl_material_arrival',
  'tpl_machine_plan',
  'tpl_abnormal_freeze',
  'tpl_shipping_risk',
  'tpl_evening_review'
)
AND status = 'todo'
AND progress = 0
AND COALESCE(blocker, '') = '';
