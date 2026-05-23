-- ================================================================
-- MES Lite 完整流程种子数据 (修复外键顺序)
-- ================================================================
PRAGMA foreign_keys = ON;

-- 1. 基础档案
INSERT OR IGNORE INTO materials (id, code, name, type, unit, spec, notes, is_active) VALUES
('mat_al01', 'M-AL01', '铝合金板材 6061', 'raw', 'kg', '厚度2mm', '', 1),
('mat_cu01', 'M-CU01', '铜棒 T2', 'raw', 'kg', '直径20mm', '', 1),
('mat_st01', 'M-ST01', '不锈钢板 304', 'raw', 'kg', '厚度1.5mm', '', 1),
('mat_pl01', 'M-PL01', 'ABS塑料粒子', 'raw', 'kg', '注塑级', '', 1),
('mat_rb01', 'M-RB01', '硅橡胶原料', 'raw', 'kg', '硬度60A', '', 1);

INSERT OR IGNORE INTO processes (id, code, name, sort_order, notes, is_active) VALUES
('proc_cut',   'PROC-CUT',   '数控裁切', 10, '', 1),
('proc_press', 'PROC-PRESS', '冲压成型', 20, '', 1),
('proc_weld',  'PROC-WELD',  '焊接组装', 30, '', 1),
('proc_qc',    'PROC-QC',    '终检出货', 40, '', 1);

INSERT OR IGNORE INTO machines (id, code, name, process_id, status, notes, is_active) VALUES
('mc_001', 'MC-001', '数控裁切机1号', 'proc_cut',   'available', '', 1),
('mc_002', 'MC-002', '冲压机2号',     'proc_press', 'available', '', 1),
('mc_003', 'MC-003', '焊接机器人1号', 'proc_weld',  'available', '', 1);

INSERT OR IGNORE INTO products (id, code, name, customer_name, project_name, material_id, unit, process_route, notes, is_active) VALUES
('prod_a001', 'P-A001', '铝合金外壳A型',   '华为技术',   'HW-2026',  'mat_al01', 'pcs', '["proc_cut","proc_press","proc_qc"]',              '', 1),
('prod_b002', 'P-B002', '铜制连接器B型',   '小米科技',   'XM-2026',  'mat_cu01', 'pcs', '["proc_cut","proc_qc"]',                          '', 1),
('prod_c003', 'P-C003', '不锈钢支架C型',   '比亚迪汽车', 'BYD-2026', 'mat_st01', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '', 1),
('prod_d004', 'P-D004', '工程塑料面板D型', '华为技术',   'HW-2026',  'mat_pl01', 'pcs', '["proc_qc"]',                                      '', 1),
('prod_e005', 'P-E005', '硅橡胶密封件E型', '比亚迪汽车', 'BYD-2026', 'mat_rb01', 'pcs', '["proc_qc"]',                                      '', 1);

INSERT OR IGNORE INTO customers (id, code, name, contact, notes, is_active) VALUES
('cust_hw',  'CUST-HW',  '华为技术有限公司',   '张采购 13800000001', '', 1),
('cust_xm',  'CUST-XM',  '小米科技有限公司',   '李采购 13800000002', '', 1),
('cust_byd', 'CUST-BYD', '比亚迪汽车有限公司', '王采购 13800000003', '', 1);

-- 2. 订单
INSERT OR IGNORE INTO customer_orders (id, code, customer_id, customer_name, status, requested_date, notes) VALUES
('co_001', 'CO-20260516-001', 'cust_hw',  '华为技术有限公司',   'confirmed', '2026-05-30', '华为第一批次'),
('co_002', 'CO-20260516-002', 'cust_xm',  '小米科技有限公司',   'confirmed', '2026-06-05', '小米追加单'),
('co_003', 'CO-20260516-003', 'cust_byd', '比亚迪汽车有限公司', 'confirmed', '2026-06-15', '比亚迪配套');

INSERT OR IGNORE INTO customer_order_items (id, order_id, product_id, product_code, product_name, material_id, quantity, delivered_quantity, due_date, status) VALUES
('coi_001', 'co_001', 'prod_a001', 'P-A001', '铝合金外壳A型',   'mat_al01', 500,  0, '2026-05-30', 'open'),
('coi_002', 'co_001', 'prod_d004', 'P-D004', '工程塑料面板D型', 'mat_pl01', 500,  0, '2026-05-30', 'open'),
('coi_003', 'co_001', 'prod_b002', 'P-B002', '铜制连接器B型',   'mat_cu01', 200,  0, '2026-05-28', 'open'),
('coi_004', 'co_002', 'prod_b002', 'P-B002', '铜制连接器B型',   'mat_cu01', 300,  0, '2026-06-05', 'open'),
('coi_005', 'co_002', 'prod_a001', 'P-A001', '铝合金外壳A型',   'mat_al01', 200,  0, '2026-06-05', 'open'),
('coi_006', 'co_003', 'prod_c003', 'P-C003', '不锈钢支架C型',   'mat_st01', 400,  0, '2026-06-15', 'open'),
('coi_007', 'co_003', 'prod_e005', 'P-E005', '硅橡胶密封件E型', 'mat_rb01', 1000, 0, '2026-06-15', 'open'),
('coi_008', 'co_003', 'prod_a001', 'P-A001', '铝合金外壳A型',   'mat_al01', 300,  0, '2026-06-10', 'open'),
('coi_009', 'co_001', 'prod_e005', 'P-E005', '硅橡胶密封件E型', 'mat_rb01', 200,  0, '2026-05-29', 'open'),
('coi_010', 'co_002', 'prod_c003', 'P-C003', '不锈钢支架C型',   'mat_st01', 150,  0, '2026-06-08', 'open');

-- 3. 库存
INSERT OR IGNORE INTO inventory_balances (id, material_id, product_id, warehouse_code, batch_no, qty_available, qty_frozen, qty_scrap, unit) VALUES
('bal_al01', 'mat_al01', NULL, 'MAIN', 'BAT-AL-2026001', 2000, 0, 0, 'kg'),
('bal_cu01', 'mat_cu01', NULL, 'MAIN', 'BAT-CU-2026001',  800, 0, 0, 'kg'),
('bal_st01', 'mat_st01', NULL, 'MAIN', 'BAT-ST-2026001', 1500, 0, 0, 'kg'),
('bal_pl01', 'mat_pl01', NULL, 'MAIN', 'BAT-PL-2026001',  500, 0, 0, 'kg'),
('bal_rb01', 'mat_rb01', NULL, 'MAIN', 'BAT-RB-2026001',  600, 0, 0, 'kg');

-- 4. 生产计划头
INSERT OR IGNORE INTO production_plans (id, code, title, plan_date, status, created_by) VALUES
('pp_001', 'PP-20260516-001', '五月第三周生产计划', '2026-05-19', 'released', 'admin'),
('pp_002', 'PP-20260516-002', '五月第四周生产计划', '2026-05-26', 'draft',    'admin');

-- 5. 工单 (不带 current_step_id)
INSERT OR IGNORE INTO work_orders (id, code, product_id, material_id, customer_name, project_name, planned_quantity, completed_quantity, defect_quantity, scrap_quantity, status, planned_start_date, planned_finish_date) VALUES
('wo_001', 'WO-HW-2026-20260516-001',  'prod_a001', 'mat_al01', '华为技术有限公司',   'HW-2026',  500, 0, 0, 0, 'released', '2026-05-19', '2026-05-23'),
('wo_002', 'WO-HW-2026-20260516-002',  'prod_d004', 'mat_pl01', '华为技术有限公司',   'HW-2026',  500, 0, 0, 0, 'released', '2026-05-19', '2026-05-21'),
('wo_003', 'WO-HW-2026-20260516-003',  'prod_b002', 'mat_cu01', '华为技术有限公司',   'HW-2026',  200, 0, 0, 0, 'released', '2026-05-19', '2026-05-22'),
('wo_004', 'WO-BYD-2026-20260516-001', 'prod_c003', 'mat_st01', '比亚迪汽车有限公司', 'BYD-2026', 400, 0, 0, 0, 'released', '2026-05-19', '2026-05-26'),
('wo_005', 'WO-BYD-2026-20260516-002', 'prod_e005', 'mat_rb01', '比亚迪汽车有限公司', 'BYD-2026', 500, 0, 0, 0, 'released', '2026-05-19', '2026-05-22');

-- 6. 工单工序步骤
INSERT OR IGNORE INTO work_order_steps (id, work_order_id, process_id, step_order, name, planned_quantity, completed_quantity, defect_quantity, scrap_quantity, status, machine_id) VALUES
('step_001_1', 'wo_001', 'proc_cut',   10, '数控裁切', 500, 0, 0, 0, 'pending', 'mc_001'),
('step_001_2', 'wo_001', 'proc_press', 20, '冲压成型', 500, 0, 0, 0, 'pending', 'mc_002'),
('step_001_3', 'wo_001', 'proc_qc',    30, '终检出货', 500, 0, 0, 0, 'pending', NULL),
('step_002_1', 'wo_002', 'proc_qc',    10, '终检出货', 500, 0, 0, 0, 'pending', NULL),
('step_003_1', 'wo_003', 'proc_cut',   10, '数控裁切', 200, 0, 0, 0, 'pending', 'mc_001'),
('step_003_2', 'wo_003', 'proc_qc',    20, '终检出货', 200, 0, 0, 0, 'pending', NULL),
('step_004_1', 'wo_004', 'proc_cut',   10, '数控裁切', 400, 0, 0, 0, 'pending', 'mc_001'),
('step_004_2', 'wo_004', 'proc_press', 20, '冲压成型', 400, 0, 0, 0, 'pending', 'mc_002'),
('step_004_3', 'wo_004', 'proc_weld',  30, '焊接组装', 400, 0, 0, 0, 'pending', 'mc_003'),
('step_004_4', 'wo_004', 'proc_qc',    40, '终检出货', 400, 0, 0, 0, 'pending', NULL),
('step_005_1', 'wo_005', 'proc_qc',    10, '终检出货', 500, 0, 0, 0, 'pending', NULL);

-- 7. 计划明细 (引用工单)
INSERT OR IGNORE INTO production_plan_items (id, plan_id, order_item_id, product_id, material_id, planned_quantity, machine_id, planned_start_date, planned_finish_date, status, work_order_id) VALUES
('ppi_001', 'pp_001', 'coi_001', 'prod_a001', 'mat_al01', 500, 'mc_001', '2026-05-19', '2026-05-23', 'work_order_created', 'wo_001'),
('ppi_002', 'pp_001', 'coi_002', 'prod_d004', 'mat_pl01', 500, NULL,     '2026-05-19', '2026-05-21', 'work_order_created', 'wo_002'),
('ppi_003', 'pp_001', 'coi_003', 'prod_b002', 'mat_cu01', 200, 'mc_001', '2026-05-19', '2026-05-22', 'work_order_created', 'wo_003'),
('ppi_004', 'pp_001', 'coi_006', 'prod_c003', 'mat_st01', 400, 'mc_002', '2026-05-19', '2026-05-26', 'work_order_created', 'wo_004'),
('ppi_005', 'pp_001', 'coi_007', 'prod_e005', 'mat_rb01', 500, NULL,     '2026-05-19', '2026-05-22', 'work_order_created', 'wo_005'),
('ppi_006', 'pp_002', 'coi_004', 'prod_b002', 'mat_cu01', 300, 'mc_001', '2026-05-26', '2026-05-29', 'draft', NULL),
('ppi_007', 'pp_002', 'coi_005', 'prod_a001', 'mat_al01', 200, 'mc_001', '2026-05-26', '2026-05-28', 'draft', NULL),
('ppi_008', 'pp_002', 'coi_008', 'prod_a001', 'mat_al01', 300, 'mc_002', '2026-05-26', '2026-05-30', 'draft', NULL),
('ppi_009', 'pp_002', 'coi_009', 'prod_e005', 'mat_rb01', 200, NULL,     '2026-05-26', '2026-05-28', 'draft', NULL),
('ppi_010', 'pp_002', 'coi_010', 'prod_c003', 'mat_st01', 150, 'mc_002', '2026-05-26', '2026-06-02', 'draft', NULL);

-- 8. 后续更新
UPDATE work_orders SET current_step_id = 'step_001_1' WHERE id = 'wo_001';
UPDATE work_orders SET current_step_id = 'step_002_1' WHERE id = 'wo_002';
UPDATE work_orders SET current_step_id = 'step_003_1' WHERE id = 'wo_003';
UPDATE work_orders SET current_step_id = 'step_004_1' WHERE id = 'wo_004';
UPDATE work_orders SET current_step_id = 'step_005_1' WHERE id = 'wo_005';

UPDATE customer_orders SET status = 'in_production' WHERE id IN ('co_001', 'co_002', 'co_003');
UPDATE customer_order_items SET status = 'in_production' WHERE id IN ('coi_001','coi_002','coi_003','coi_006','coi_007');
