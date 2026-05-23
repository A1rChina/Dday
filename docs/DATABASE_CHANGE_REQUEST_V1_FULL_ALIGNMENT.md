# Dday V1 全量数据库对齐变更申请

# 一、变更原则

本次变更申请采用“一次性 V1 对齐、分阶段安全执行”的原则。

含义：

1. 一次性梳理 V1 应补齐的所有字段。
2. 一次性明确所有字段类型、默认值、是否必填、迁移风险。
3. 一次性明确状态枚举和默认值修正。
4. 一次性明确旧字段兼容与 deprecated 策略。
5. 实际执行时可以分阶段 migration，避免破坏已有数据。
6. 不做 v2 字段。
7. 不物理删除 deprecated 表。
8. 不直接强制 NOT NULL，除非确认无历史数据或已完成回填。

# 二、变更范围总览

本次申请只覆盖 `DATABASE_LOCK_V1.md` 中已经列出的 V1 字段。

## 2.1 本次纳入范围

纳入所有状态为：

- `need_add (lock_before_v1)`
- `need_add (v1_later)`
- 必须修正的状态默认值
- 必须废弃但暂不删除的旧字段说明
- 必须统一的状态枚举

## 2.2 本次不纳入范围

不纳入：

- `need_add (v2)`
- 物理删除 deprecated 表
- 物理删除 deprecated 字段
- 大规模表重建
- 新增未在 `DATABASE_LOCK_V1.md` 中出现的字段
- 新增未在 `DATABASE_LOCK_V1.md` 中出现的表

# 三、V1 必须新增字段清单

以下字段按模块整理，均来自 `DATABASE_LOCK_V1.md` 已明确的 V1 对齐范围。

| 模块 | 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 主数据 | `customers` | `customerCode` | `customer_code` | text | 后续新增时必填 | 空 | v1_later | 客户业务编码 |
| 主数据 | `profile_suppliers` | `supplierCode` | `supplier_code` | text | 后续新增时必填 | 空 | v1_later | 供应商业务编码 |
| 主数据 | `products` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 替代文本工厂字段 |
| 主数据 | `products` | `drawingNo` | `drawing_no` | text | 后续新增时选填 | `''` | v1_later | 图纸号 / 版本 |
| 主数据 | `materials` | `supplierId` | `supplier_id` | text | 后续新增时选填 | 空 | v1_later | 默认供应商 |
| 主数据 | `materials` | `materialCategory` | `material_category` | text | 后续新增时选填 | `''` | v1_later | 物料类别 |
| 主数据 | `materials` | `defaultLeadTime` | `default_lead_time` | integer | 后续新增时必填 | `0` | v1_later | 默认采购提前期 |
| 主数据 | `product_materials` | `usageUnit` | `usage_unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 消耗单位 |
| 主数据 | `product_materials` | `lossRate` | `loss_rate` | real | 后续新增时必填 | `0.0` | v1_later | 损耗率 |
| 主数据 | `product_materials` | `isPrimary` | `is_primary` | integer | 后续新增时必填 | `1` | v1_later | 是否主型材 |
| 主数据 | `product_materials` | `remark` | `remark` | text | 后续新增时选填 | `''` | v1_later | BOM备注 |
| 需求 | `demand_lines` | `projectId` | `project_id` | text | 后续新增时必填 | 空 | v1_later | 需求行关联项目 |
| 需求 | `demand_lines` | `requiredQuantity` | `required_quantity` | integer | 后续新增时必填 | `0` | v1_later | 实际需求量 |
| 需求 | `demand_lines` | `plannedQuantity` | `planned_quantity` | integer | 后续新增时必填 | `0` | v1_later | 已排产数量 |
| 需求 | `demand_lines` | `producedQuantity` | `produced_quantity` | integer | 后续新增时必填 | `0` | v1_later | 已生产数量 |
| 需求 | `demand_lines` | `cancelledQuantity` | `cancelled_quantity` | integer | 后续新增时选填 | `0` | v1_later | 已取消数量 |
| 需求 | `demand_lines` | `priority` | `priority` | text | 后续新增时必填 | `'medium'` | v1_later | 优先级 |
| 需求 | `demand_lines` | `sourceLineNo` | `source_line_no` | text | 后续新增时选填 | `''` | v1_later | 导入原始行号 |
| 需求 | `demand_lines` | `closedAt` | `closed_at` | text | 后续新增时选填 | 空 | v1_later | 关闭时间 |
| 生产 | `production_plans` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 计划执行工厂 |
| 生产 | `production_plans` | `planType` | `plan_type` | text | 后续新增时选填 | `'normal'` | v1_later | 计划类型 |
| 生产 | `production_plans` | `lockedAt` | `locked_at` | text | 后续新增时选填 | 空 | v1_later | 计划锁定时间 |
| 生产 | `production_plans` | `cancelledAt` | `cancelled_at` | text | 后续新增时选填 | 空 | v1_later | 计划取消时间 |
| 生产 | `work_orders` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 工单执行工厂 |
| 生产 | `work_orders` | `processRouteSnapshot` | `process_route_snapshot` | text | 后续新增时必填 | `'[]'` | v1_later | 工艺路线快照 |
| 生产 | `work_orders` | `releasedAt` | `released_at` | text | 后续新增时选填 | 空 | v1_later | 下发时间 |
| 生产 | `work_orders` | `startedAt` | `started_at` | text | 后续新增时选填 | 空 | v1_later | 开工时间 |
| 生产 | `work_orders` | `cancelledAt` | `cancelled_at` | text | 后续新增时选填 | 空 | v1_later | 取消时间 |
| 生产 | `work_order_steps` | `processCode` | `process_code` | text | 后续新增时选填 | `''` | v1_later | 工序编码快照 |
| 生产 | `work_order_steps` | `machineCode` | `machine_code` | text | 后续新增时选填 | `''` | v1_later | 设备编码快照 |
| 生产 | `work_order_steps` | `operator` | `operator` | text | 后续新增时选填 | `''` | v1_later | 操作员 |
| 生产 | `work_order_steps` | `qualityRequired` | `quality_required` | integer | 后续新增时选填 | `0` | v1_later | 是否强检 |
| 报工 | `operation_reports` | `workOrderId` | `work_order_id` | text | 后续新增时必填 | 空 | v1_later | 替代 productionOrderId |
| 报工 | `operation_reports` | `machineId` | `machine_id` | text | 后续新增时选填 | 空 | v1_later | 关联设备 |
| 仓储库存 | `warehouses` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 仓库所属工厂 |
| 仓储库存 | `warehouses` | `isVirtual` | `is_virtual` | integer | 后续新增时选填 | `0` | v1_later | 是否虚拟仓 |
| 仓储库存 | `warehouses` | `sortOrder` | `sort_order` | integer | 后续新增时选填 | `0` | v1_later | 排序 |
| 仓储库存 | `locations` | `warehouseId` | `warehouse_id` | text | 后续新增时必填 | 空 | v1_later | 替代 warehouseCode |
| 仓储库存 | `locations` | `isDefault` | `is_default` | integer | 后续新增时选填 | `0` | v1_later | 是否默认库位 |
| 仓储库存 | `locations` | `sortOrder` | `sort_order` | integer | 后续新增时选填 | `0` | v1_later | 排序 |
| 仓储库存 | `receipts` | `sourceId` | `source_id` | text | 后续新增时选填 | 空 | v1_later | 源单ID |
| 仓储库存 | `receipts` | `sourceNo` | `source_no` | text | 后续新增时选填 | 空 | v1_later | 源单号 |
| 仓储库存 | `receipts` | `confirmedAt` | `confirmed_at` | text | 后续新增时选填 | 空 | v1_later | 确认时间 |
| 仓储库存 | `receipts` | `confirmedBy` | `confirmed_by` | text | 后续新增时选填 | 空 | v1_later | 确认人 |
| 仓储库存 | `receipt_items` | `itemType` | `item_type` | text | 是 | 空 | lock_before_v1 | 区分 product / material |
| 仓储库存 | `receipt_items` | `itemCode` | `item_code` | text | 后续新增时选填 | `''` | v1_later | 物品编码快照 |
| 仓储库存 | `receipt_items` | `itemName` | `item_name` | text | 后续新增时选填 | `''` | v1_later | 物品名称快照 |
| 仓储库存 | `receipt_items` | `unit` | `unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 单位 |
| 仓储库存 | `receipt_items` | `inventoryStatus` | `inventory_status` | text | 后续新增时选填 | `'available'` | v1_later | 入库库存状态 |
| 仓储库存 | `issues` | `sourceId` | `source_id` | text | 后续新增时选填 | 空 | v1_later | 源单ID |
| 仓储库存 | `issues` | `sourceNo` | `source_no` | text | 后续新增时选填 | 空 | v1_later | 源单号 |
| 仓储库存 | `issues` | `confirmedAt` | `confirmed_at` | text | 后续新增时选填 | 空 | v1_later | 确认时间 |
| 仓储库存 | `issues` | `confirmedBy` | `confirmed_by` | text | 后续新增时选填 | 空 | v1_later | 确认人 |
| 仓储库存 | `issue_items` | `itemType` | `item_type` | text | 是 | 空 | lock_before_v1 | 区分 product / material |
| 仓储库存 | `issue_items` | `itemCode` | `item_code` | text | 后续新增时选填 | `''` | v1_later | 物品编码快照 |
| 仓储库存 | `issue_items` | `itemName` | `item_name` | text | 后续新增时选填 | `''` | v1_later | 物品名称快照 |
| 仓储库存 | `issue_items` | `unit` | `unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 单位 |
| 仓储库存 | `issue_items` | `inventoryStatus` | `inventory_status` | text | 后续新增时选填 | `'available'` | v1_later | 出库库存状态 |
| 质量 | `quality_issues` | `warehouseId` | `warehouse_id` | text | 后续新增时选填 | 空 | v1_later | 异常库存仓库ID |
| 质量 | `quality_issues` | `locationId` | `location_id` | text | 后续新增时选填 | 空 | v1_later | 异常库存库位ID |
| 质量 | `issue_actions` | `actionType` | `action_type` | text | 后续新增时选填 | `''` | v1_later | 动作类型 |
| 质量 | `issue_actions` | `quantity` | `quantity` | integer | 后续新增时选填 | `0` | v1_later | 动作数量 |
| 质量 | `issue_actions` | `relatedTransactionId` | `related_transaction_id` | text | 后续新增时选填 | 空 | v1_later | 关联库存流水 |
| 质量 | `issue_actions` | `relatedHoldId` | `related_hold_id` | text | 后续新增时选填 | 空 | v1_later | 关联冻结记录 |
| 发货 | `shipment_items` | `demandLineId` | `demand_line_id` | text | 是 | 空 | lock_before_v1 | 发货明细回写需求行 |
| 发货 | `shipment_items` | `warehouseId` | `warehouse_id` | text | 后续新增时选填 | 空 | v1_later | 出库仓库 |
| 发货 | `shipment_items` | `locationId` | `location_id` | text | 后续新增时选填 | 空 | v1_later | 出库库位 |
| 发货 | `shipment_items` | `unit` | `unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 单位 |
| 发货 | `shipment_items` | `productCode` | `product_code` | text | 后续新增时选填 | `''` | v1_later | 产品编码快照 |
| 发货 | `shipment_items` | `productName` | `product_name` | text | 后续新增时选填 | `''` | v1_later | 产品名称快照 |

## 3.1 主数据字段

### customers

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `customers` | `customerCode` | `customer_code` | text | 后续新增时必填 | 空 | v1_later | 客户业务编码 |

### profile_suppliers

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `profile_suppliers` | `supplierCode` | `supplier_code` | text | 后续新增时必填 | 空 | v1_later | 供应商业务编码 |

### products

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `products` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 替代文本工厂字段 |
| `products` | `drawingNo` | `drawing_no` | text | 后续新增时选填 | `''` | v1_later | 图纸号 / 版本 |

### materials

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `materials` | `supplierId` | `supplier_id` | text | 后续新增时选填 | 空 | v1_later | 默认供应商 |
| `materials` | `materialCategory` | `material_category` | text | 后续新增时选填 | `''` | v1_later | 物料类别 |
| `materials` | `defaultLeadTime` | `default_lead_time` | integer | 后续新增时必填 | `0` | v1_later | 默认采购提前期 |

### product_materials

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `product_materials` | `usageUnit` | `usage_unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 消耗单位 |
| `product_materials` | `lossRate` | `loss_rate` | real | 后续新增时必填 | `0.0` | v1_later | 损耗率 |
| `product_materials` | `isPrimary` | `is_primary` | integer | 后续新增时必填 | `1` | v1_later | 是否主型材 |
| `product_materials` | `remark` | `remark` | text | 后续新增时选填 | `''` | v1_later | BOM备注 |

## 3.2 需求 / 订单字段

### demand_lines

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `demand_lines` | `projectId` | `project_id` | text | 后续新增时必填 | 空 | v1_later | 需求行关联项目 |
| `demand_lines` | `requiredQuantity` | `required_quantity` | integer | 后续新增时必填 | `0` | v1_later | 实际需求量 |
| `demand_lines` | `plannedQuantity` | `planned_quantity` | integer | 后续新增时必填 | `0` | v1_later | 已排产数量 |
| `demand_lines` | `producedQuantity` | `produced_quantity` | integer | 后续新增时必填 | `0` | v1_later | 已生产数量 |
| `demand_lines` | `cancelledQuantity` | `cancelled_quantity` | integer | 后续新增时选填 | `0` | v1_later | 已取消数量 |
| `demand_lines` | `priority` | `priority` | text | 后续新增时必填 | `'medium'` | v1_later | 优先级 |
| `demand_lines` | `sourceLineNo` | `source_line_no` | text | 后续新增时选填 | `''` | v1_later | 导入原始行号 |
| `demand_lines` | `closedAt` | `closed_at` | text | 后续新增时选填 | 空 | v1_later | 关闭时间 |

## 3.3 生产字段

### production_plans

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `production_plans` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 计划执行工厂 |
| `production_plans` | `planType` | `plan_type` | text | 后续新增时选填 | `'normal'` | v1_later | 计划类型 |
| `production_plans` | `lockedAt` | `locked_at` | text | 后续新增时选填 | 空 | v1_later | 计划锁定时间 |
| `production_plans` | `cancelledAt` | `cancelled_at` | text | 后续新增时选填 | 空 | v1_later | 计划取消时间 |

### work_orders

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `work_orders` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 工单执行工厂 |
| `work_orders` | `processRouteSnapshot` | `process_route_snapshot` | text | 后续新增时必填 | `'[]'` | v1_later | 工艺路线快照 |
| `work_orders` | `releasedAt` | `released_at` | text | 后续新增时选填 | 空 | v1_later | 下发时间 |
| `work_orders` | `startedAt` | `started_at` | text | 后续新增时选填 | 空 | v1_later | 开工时间 |
| `work_orders` | `cancelledAt` | `cancelled_at` | text | 后续新增时选填 | 空 | v1_later | 取消时间 |

### work_order_steps

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `work_order_steps` | `processCode` | `process_code` | text | 后续新增时选填 | `''` | v1_later | 工序编码快照 |
| `work_order_steps` | `machineCode` | `machine_code` | text | 后续新增时选填 | `''` | v1_later | 设备编码快照 |
| `work_order_steps` | `operator` | `operator` | text | 后续新增时选填 | `''` | v1_later | 操作员 |
| `work_order_steps` | `qualityRequired` | `quality_required` | integer | 后续新增时选填 | `0` | v1_later | 是否强检 |

注意：

- `reportedQuantity` 是 `need_review`，本次申请只列入“待确认字段”，不要直接纳入 migration。

### operation_reports

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `operation_reports` | `workOrderId` | `work_order_id` | text | 后续新增时必填 | 空 | v1_later | 替代 productionOrderId |
| `operation_reports` | `machineId` | `machine_id` | text | 后续新增时选填 | 空 | v1_later | 关联设备 |

## 3.4 仓储 / 库存字段

### warehouses

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `warehouses` | `factoryId` | `factory_id` | text | 后续新增时必填 | 空 | v1_later | 仓库所属工厂 |
| `warehouses` | `isVirtual` | `is_virtual` | integer | 后续新增时选填 | `0` | v1_later | 是否虚拟仓 |
| `warehouses` | `sortOrder` | `sort_order` | integer | 后续新增时选填 | `0` | v1_later | 排序 |

### locations

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `locations` | `warehouseId` | `warehouse_id` | text | 后续新增时必填 | 空 | v1_later | 替代 warehouseCode |
| `locations` | `isDefault` | `is_default` | integer | 后续新增时选填 | `0` | v1_later | 是否默认库位 |
| `locations` | `sortOrder` | `sort_order` | integer | 后续新增时选填 | `0` | v1_later | 排序 |

### receipts

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `receipts` | `sourceId` | `source_id` | text | 后续新增时选填 | 空 | v1_later | 源单ID |
| `receipts` | `sourceNo` | `source_no` | text | 后续新增时选填 | 空 | v1_later | 源单号 |
| `receipts` | `confirmedAt` | `confirmed_at` | text | 后续新增时选填 | 空 | v1_later | 确认时间 |
| `receipts` | `confirmedBy` | `confirmed_by` | text | 后续新增时选填 | 空 | v1_later | 确认人 |

### receipt_items

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `receipt_items` | `itemType` | `item_type` | text | 是 | 空 | lock_before_v1 | 区分 product / material |
| `receipt_items` | `itemCode` | `item_code` | text | 后续新增时选填 | `''` | v1_later | 物品编码快照 |
| `receipt_items` | `itemName` | `item_name` | text | 后续新增时选填 | `''` | v1_later | 物品名称快照 |
| `receipt_items` | `unit` | `unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 单位 |
| `receipt_items` | `inventoryStatus` | `inventory_status` | text | 后续新增时选填 | `'available'` | v1_later | 入库库存状态 |

### issues

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `issues` | `sourceId` | `source_id` | text | 后续新增时选填 | 空 | v1_later | 源单ID |
| `issues` | `sourceNo` | `source_no` | text | 后续新增时选填 | 空 | v1_later | 源单号 |
| `issues` | `confirmedAt` | `confirmed_at` | text | 后续新增时选填 | 空 | v1_later | 确认时间 |
| `issues` | `confirmedBy` | `confirmed_by` | text | 后续新增时选填 | 空 | v1_later | 确认人 |

### issue_items

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `issue_items` | `itemType` | `item_type` | text | 是 | 空 | lock_before_v1 | 区分 product / material |
| `issue_items` | `itemCode` | `item_code` | text | 后续新增时选填 | `''` | v1_later | 物品编码快照 |
| `issue_items` | `itemName` | `item_name` | text | 后续新增时选填 | `''` | v1_later | 物品名称快照 |
| `issue_items` | `unit` | `unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 单位 |
| `issue_items` | `inventoryStatus` | `inventory_status` | text | 后续新增时选填 | `'available'` | v1_later | 出库库存状态 |

## 3.5 质量字段

### quality_issues

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `quality_issues` | `warehouseId` | `warehouse_id` | text | 后续新增时选填 | 空 | v1_later | 异常库存仓库ID |
| `quality_issues` | `locationId` | `location_id` | text | 后续新增时选填 | 空 | v1_later | 异常库存库位ID |

注意：

- `freezeId` 不新增、不迁移，只列入 deprecated 逻辑清理。
- `inventoryLockId` 是唯一有效冻结关联字段。

### issue_actions

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `issue_actions` | `actionType` | `action_type` | text | 后续新增时选填 | `''` | v1_later | 动作类型 |
| `issue_actions` | `quantity` | `quantity` | integer | 后续新增时选填 | `0` | v1_later | 动作数量 |
| `issue_actions` | `relatedTransactionId` | `related_transaction_id` | text | 后续新增时选填 | 空 | v1_later | 关联库存流水 |
| `issue_actions` | `relatedHoldId` | `related_hold_id` | text | 后续新增时选填 | 空 | v1_later | 关联冻结记录 |

## 3.6 发货字段

### shipment_items

| 表 | TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议默认值 | 优先级 | 说明 |
|---|---|---|---|---|---|---|---|
| `shipment_items` | `demandLineId` | `demand_line_id` | text | 是 | 空 | lock_before_v1 | 发货明细回写需求行 |
| `shipment_items` | `warehouseId` | `warehouse_id` | text | 后续新增时选填 | 空 | v1_later | 出库仓库 |
| `shipment_items` | `locationId` | `location_id` | text | 后续新增时选填 | 空 | v1_later | 出库库位 |
| `shipment_items` | `unit` | `unit` | text | 后续新增时选填 | `'pcs'` | v1_later | 单位 |
| `shipment_items` | `productCode` | `product_code` | text | 后续新增时选填 | `''` | v1_later | 产品编码快照 |
| `shipment_items` | `productName` | `product_name` | text | 后续新增时选填 | `''` | v1_later | 产品名称快照 |

# 四、状态默认值修正

## 4.1 demand_lines.status

当前问题：

- `DATABASE_LOCK_V1.md` 已明确导入后 `customer_demands.status = imported`，`demand_lines.status = imported`。
- 但当前 schema 可能仍将 `demand_lines.status` 默认设置为 `confirmed`。

申请：

| 表 | 字段 | 当前默认值 | 目标默认值 | 原因 |
|---|---|---|---|---|
| `demand_lines` | `status` | `confirmed` | `imported` | 保证需求主表和明细行导入状态一致 |

要求：

- 本申请只提出修正建议。
- 具体是否能通过 ALTER 修改默认值，需要 migration 实现阶段评估。
- 如果 D1 无法直接修改默认值，需要通过表重建或 service 层默认写入实现。

# 五、deprecated 字段兼容策略

| 表 | 字段 | 当前状态 | V1 策略 |
|---|---|---|---|
| `projects` | `party_id` | rename_later | 暂保留，后续迁移为 customer_id |
| `products` | `party_id` | deprecated | 新逻辑不依赖 |
| `products` | `profile_code` | deprecated | 新逻辑走 product_materials |
| `production_plans` | `order_line_id` | deprecated | 新逻辑走 production_demand_links |
| `work_orders` | `order_line_id` | deprecated | 新逻辑通过 productionPlanId 追溯 |
| `quality_issues` | `freezeId` | deprecated | 新逻辑只用 inventoryLockId |
| `shipments` | `orderId/orderLineId/orderItemId` | deprecated | 新逻辑走 demandId/demandLineId |
| `shipment_items` | `orderItemId` | deprecated | 新逻辑走 demandLineId |
| `operation_reports` | `productionOrderId` | rename_later | 后续迁移为 workOrderId |
| `operation_reports` | `equipment` | rename_later | 后续迁移为 machineId |

要求：

- 本次不删除这些字段。
- 本次不强行重命名这些字段。
- 新业务代码不得继续依赖 deprecated 字段作为事实源。

# 六、migration 策略

## 6.1 如果当前数据库无正式生产数据

推荐策略：

1. 直接更新 `src/db/schema.ts`。
2. 生成一份完整 V1 alignment migration。
3. 本地 D1 重新初始化验证。
4. 远程 D1 如无有效数据，可备份后重建。
5. 所有字段一次性进入 schema。

适用前提：

- 当前没有必须保留的线上业务数据。
- 可以接受重建 D1。
- 当前系统仍处于开发阶段。

## 6.2 如果当前数据库已有必须保留的数据

推荐策略：

1. 只做 additive migration。
2. 所有新增字段先允许 NULL。
3. 不直接新增 NOT NULL。
4. 不直接新增 CHECK。
5. 不直接删除旧字段。
6. 不直接删除 deprecated 表。
7. service 层先写入新字段。
8. 再进行历史数据回填。
9. 回填完成后再申请强约束。

## 6.3 推荐默认策略

如果无法确认是否存在正式数据，默认采用：

- additive nullable migration

即：

- 新增字段先允许 NULL。
- 业务必填通过 service 层校验。
- 历史数据回填后再申请 NOT NULL / CHECK / 索引。

# 七、历史数据回填方案

## 7.1 receipt_items.itemType

回填规则：

1. 如果 `itemId` 存在于 `products.id`，则 `itemType = 'product'`。
2. 如果 `itemId` 存在于 `materials.id`，则 `itemType = 'material'`。
3. 如果两边都不存在，标记为 `need_review`。
4. 如果两边都存在，标记为 `need_review`。

## 7.2 issue_items.itemType

同 `receipt_items.itemType`。

## 7.3 shipment_items.demandLineId

回填规则：

1. 如果所属 `shipments.demandLineId` 不为空，则回填。
2. 如果 `shipments.demandLineId` 为空，但 `shipments.demandId + productId` 能唯一匹配 `demand_lines`，则回填。
3. 如果无法唯一匹配，标记为 `need_review`。
4. 不允许猜测回填。

## 7.4 demand_lines.projectId

回填优先级：

1. 根据 `demand_lines.projectCode` 匹配 `projects.code`。
2. 如果唯一匹配，则回填。
3. 如果无法唯一匹配，则标记为 `need_review`。

## 7.5 products.factoryId

回填优先级：

1. 根据 `products.factory` 文本匹配 `manufacturing_factories.factoryName` 或 `factoryCode`。
2. 匹配成功则回填。
3. 无法匹配则标记为 `need_review`。

## 7.6 operation_reports.workOrderId

回填优先级：

1. 从 `productionOrderId` 映射为 `workOrderId`。
2. 如果确认 `productionOrderId` 当前实际存储的是 `work_orders.id`，则直接回填。
3. 如果不是，则标记为 `need_review`。

# 八、service 层后续改造要求

本次不改代码，但后续开发必须满足以下要求。

## 8.1 入库服务

后续必须：

- 新增入库明细时写入 `itemType`。
- `itemType` 只能是 `product` 或 `material`。
- 入库确认时根据 `itemType + itemId` 生成库存流水。

## 8.2 出库服务

后续必须：

- 新增出库明细时写入 `itemType`。
- `itemType` 只能是 `product` 或 `material`。
- 出库确认时根据 `itemType + itemId` 扣减库存。

## 8.3 发货服务

后续必须：

- 新增发货明细时写入 `demandLineId`。
- 启用 `shipment_items` 后，以 `shipment_items.demandLineId` 回写需求行。
- 不再依赖旧订单字段。
- 发货确认时回写 `demand_lines.shippedQuantity / unshippedQuantity`。

## 8.4 质量服务

后续必须：

- 新逻辑不再写入 `freezeId`。
- 冻结只写 `inventoryLockId`。
- 关闭质量异常前检查 `inventory_holds.remainingQuantity`。

## 8.5 报工服务

后续必须：

- `operation_reports.operationId` 指向 `work_order_steps.id`。
- 末工序报工只生成 draft 入库建议单。
- 不允许报工即 confirmed 入库。
- 型材扣减只能发生在领料 / 投料确认或首工序防重扣逻辑中。

# 九、索引建议

本次只提出建议，不直接创建索引。

建议后续考虑：

| 表 | 字段 | 原因 |
|---|---|---|
| `receipt_items` | `itemType`, `itemId` | 入库落账定位对象 |
| `issue_items` | `itemType`, `itemId` | 出库扣减定位对象 |
| `shipment_items` | `demandLineId` | 发货回写需求行 |
| `demand_lines` | `projectId` | 按项目查询需求 |
| `production_plans` | `factoryId` | 按工厂筛选计划 |
| `work_orders` | `factoryId` | 按工厂筛选工单 |
| `quality_issues` | `inventoryLockId` | 异常与冻结追溯 |

# 十、风险评估

## 10.1 低风险

- 新增 nullable 字段。
- 新增快照字段。
- 新增时间字段。
- 新增可选关联字段。

## 10.2 中风险

- `demand_lines.status` 默认值修正。
- `products.factory` 到 `factoryId` 的迁移。
- `projects.party_id` 到 `customer_id` 的迁移。
- `operation_reports.productionOrderId` 到 `workOrderId` 的迁移。

## 10.3 高风险

- 删除 deprecated 表。
- 删除 deprecated 字段。
- 直接添加 NOT NULL。
- 直接添加 CHECK。
- 重建大表。
- 未回填历史数据就切换服务层逻辑。

要求：

- 高风险事项不在本次执行范围内。
- 必须单独申请。

# 十一、回滚方案

如果执行 additive migration 后发现问题：

1. 不立即删除新增字段。
2. 暂停服务层写入新字段。
3. 回退服务层逻辑到旧字段。
4. 保留新增字段为空。
5. 修复后继续启用。
6. 只有确认废弃后，才另行申请删除字段。

说明：

- D1 / SQLite 删除字段或重建表风险较高。
- 不建议把删除字段作为第一回滚手段。

# 十二、验收标准

后续真正执行数据库变更后，必须满足以下标准。

## 12.1 schema 验收

- `src/db/schema.ts` 包含 V1 所有新增字段映射。
- TS 字段名使用驼峰。
- 数据库物理列使用蛇形。
- 不新增 `DATABASE_LOCK_V1.md` 之外的字段。

## 12.2 migration 验收

- 本地 D1 migration 成功。
- 远程 D1 migration 成功。
- 旧数据未丢失。
- 旧接口不会因 NOT NULL 失败。
- deprecated 表未被删除。

## 12.3 业务验收

- 新增入库明细可以写入 `itemType`。
- 新增出库明细可以写入 `itemType`。
- 新增发货明细可以写入 `demandLineId`。
- 需求导入后 `demand_lines.status = imported`。
- 发货确认后能准确回写需求行。
- 末工序报工不会直接 confirmed 入库。
- 库存变化仍然通过 `InventoryLedgerService`。

# 十三、本次申请结论

建议批准 Dday V1 全量数据库对齐。

推荐执行方式：

1. 如果无正式数据：可以一次性更新 schema 并生成完整 V1 migration。
2. 如果有正式数据：采用 additive nullable migration。
3. 无论哪种方式，都不删除 deprecated 表。
4. 无论哪种方式，都不直接强加 NOT NULL / CHECK。
5. 完成字段补齐后，再逐步改 service 层。
6. service 层稳定后，再考虑数据回填和强约束。
