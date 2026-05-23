-- 确保四个制造工序在本地和远程均存在
INSERT OR IGNORE INTO processes (id, code, name, sort_order, notes, is_active, created_at, updated_at) VALUES
('proc_cut', 'PROC-CUT', '数控裁切', 10, '数控精密锯切工艺', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('proc_press', 'PROC-PRESS', '冲压成型', 20, '机械冲孔及成型工艺', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('proc_weld', 'PROC-WELD', '焊接组装', 30, '机器人及人工焊接工艺', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('proc_qc', 'PROC-QC', '终检出货', 40, '终检及精包装工艺', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z');

-- 导入客户：长盈
INSERT OR IGNORE INTO customers (id, code, name, contact, notes, is_active, created_at, updated_at) VALUES
('cust_changying', 'CUST-CHANGYING', '长盈', '长盈采购部-李经理', '核心汽车零部件大客户', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z');

-- 导入佳坤供应的 8 个型材原材料
INSERT OR IGNORE INTO materials (id, code, name, type, unit, spec, notes, is_active, created_at, updated_at) VALUES
('mat_ybl_r', 'MAT-PP0168-YBL-R', '铝合金型材-右边梁原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_ybl_l', 'MAT-PP0168-YBL-L', '铝合金型材-左边梁原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_hbl', 'MAT-PP0168-HBL', '铝合金型材-后边梁原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_hl1', 'MAT-PP0168-HL1', '铝合金型材-横梁1原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_hl2', 'MAT-PP0168-HL2', '铝合金型材-横梁2原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_zl', 'MAT-PP0168-ZL', '铝合金型材-纵梁原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_ayl1', 'MAT-PP0168-AYL1', '铝合金型材-安装梁1原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('mat_qbl', 'MAT-PP0168-QBL', '铝合金型材-前边梁原材料', 'raw', 'pcs', 'AL-6063-T6', '供应商：佳坤型材', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z');

-- 导入对应的 8 个核心型材产品主数据 (绑定原材料及标准加工工艺路线)
INSERT OR IGNORE INTO products (id, code, name, customer_name, project_name, material_id, unit, process_route, notes, is_active, created_at, updated_at) VALUES
('prod_ybl_r', 'PROD-PP0168-YBL-R', '右边梁', '长盈', 'PP-0168', 'mat_ybl_r', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '重庆工厂制造，对应重庆工厂仓 (CQ_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_ybl_l', 'PROD-PP0168-YBL-L', '左边梁', '长盈', 'PP-0168', 'mat_ybl_l', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '宜宾工厂制造，对应宜宾工厂仓 (YB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_hbl', 'PROD-PP0168-HBL', '后边梁', '长盈', 'PP-0168', 'mat_hbl', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '宜宾工厂制造，对应宜宾工厂仓 (YB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_hl1', 'PROD-PP0168-HL1', '横梁1', '长盈', 'PP-0168', 'mat_hl1', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '宜宾工厂制造，对应宜宾工厂仓 (YB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_hl2', 'PROD-PP0168-HL2', '横梁2', '长盈', 'PP-0168', 'mat_hl2', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '宜宾工厂制造，对应宜宾工厂仓 (YB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_zl', 'PROD-PP0168-ZL', '纵梁', '长盈', 'PP-0168', 'mat_zl', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '外协单位制造，对应外协单位仓 (SUB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_ayl1', 'PROD-PP0168-AYL1', '安装梁1', '长盈', 'PP-0168', 'mat_ayl1', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '外协单位制造，对应外协单位仓 (SUB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z'),
('prod_qbl', 'PROD-PP0168-QBL', '前边梁', '长盈', 'PP-0168', 'mat_qbl', 'pcs', '["proc_cut","proc_press","proc_weld","proc_qc"]', '外协单位制造，对应外协单位仓 (SUB_WH)', 1, '2026-05-18T05:00:00Z', '2026-05-18T05:00:00Z');
