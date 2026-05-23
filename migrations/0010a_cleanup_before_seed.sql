-- 按依赖顺序从子表到父表逐步清除业务数据
-- 先关闭外键约束，避免触发器干扰批量清理
PRAGMA foreign_keys = OFF;

DELETE FROM supply_chain_events;
DELETE FROM shipment_items;
DELETE FROM shipments;
DELETE FROM delivery_plan_items;
DELETE FROM delivery_plans;
DELETE FROM issue_actions;
DELETE FROM quality_issues;
DELETE FROM material_freeze_items;
DELETE FROM material_freezes;
DELETE FROM inventory_movements;
DELETE FROM inventory_balances;
DELETE FROM production_reports;
DELETE FROM work_order_steps;
DELETE FROM work_orders;
DELETE FROM production_plan_items;
DELETE FROM production_plans;
DELETE FROM demand_plan_versions;
DELETE FROM customer_order_items;
DELETE FROM customer_orders;
DELETE FROM customers;
DELETE FROM products;
DELETE FROM machines;
DELETE FROM processes;
DELETE FROM materials;

PRAGMA foreign_keys = ON;
