# Dday V1 数据库字段定义文档

本文档逐表列出了 Dday 项目中当前所有的数据库字段。字段信息以 `src/db/schema.ts` 为准。

## 备注规则说明

- **keep**: 字段设计合理，继续保留。
- **rename_later**: 字段命名风格不统一（如 JS 属性使用 camelCase，但其他表使用 snake_case），建议后续统一重命名。
- **deprecated**: 字段已废弃。对于 V1 表中引用了废弃表（如 `order_lines` 等）的字段，标记为 deprecated。
- **need_review**: 字段设计或类型可能不合理，或属于未分类表中的字段，需后续评审。

## users [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| username | username | TEXT | 是 | - | keep (unique) |
| display_name | display_name | TEXT | 是 | - | keep (default: '') |
| role | role | TEXT | 是 | - | keep (default: 'viewer') |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| password_hash | password_hash | TEXT | 是 | - | keep (default: '') |
| created_at | created_at | TEXT | 是 | 创建时间 | keep |
| updated_at | updated_at | TEXT | 是 | 更新时间 | keep |

## roles [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| name | name | TEXT | 是 | 名称 | keep |
| description | description | TEXT | 是 | - | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## permissions [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| module | module | TEXT | 是 | - | keep |
| action | action | TEXT | 是 | - | keep |
| description | description | TEXT | 是 | - | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## role_permissions [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| roleCode | role_code | TEXT | 是 | - | rename_later |
| permissionCode | permission_code | TEXT | 是 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## customers [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later (primary key) |
| customerName | customer_name | TEXT | 是 | - | rename_later |
| customerShortName | customer_short_name | TEXT | 是 | - | rename_later (default: '') |
| contactPerson | contact_person | TEXT | 是 | - | rename_later (default: '') |
| contactPhone | contact_phone | TEXT | 是 | - | rename_later (default: '') |
| deliveryAddress | delivery_address | TEXT | 是 | - | rename_later (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## profile_suppliers [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| supplierId | supplier_id | TEXT | 否 | 主键 ID | rename_later (primary key) |
| supplierName | supplier_name | TEXT | 是 | - | rename_later |
| supplierShortName | supplier_short_name | TEXT | 是 | - | rename_later (default: '') |
| contactPerson | contact_person | TEXT | 是 | - | rename_later (default: '') |
| contactPhone | contact_phone | TEXT | 是 | - | rename_later (default: '') |
| address | address | TEXT | 是 | - | keep (default: '') |
| defaultLeadTime | default_lead_time | INTEGER | 是 | - | rename_later (default: 0) |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## parts [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| partId | part_id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| partName | part_name | TEXT | 是 | - | deprecated |
| partNumber | part_number | TEXT | 是 | - | deprecated (unique) |
| unit | unit | TEXT | 是 | - | deprecated (default: 'PCS') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'active') |
| remark | remark | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## manufacturing_factories [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| factoryId | factory_id | TEXT | 否 | 主键 ID | rename_later (primary key) |
| factoryName | factory_name | TEXT | 是 | - | rename_later |
| factoryCode | factory_code | TEXT | 是 | - | rename_later (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## project_parts [未分类表 - 需评审]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | need_review (primary key) |
| projectId | project_id | TEXT | 是 | - | need_review |
| partId | part_id | TEXT | 是 | 主键 ID | need_review |
| customerId | customer_id | TEXT | 否 | 主键 ID | need_review |
| supplierId | supplier_id | TEXT | 否 | 主键 ID | need_review |
| manufacturingFactory | manufacturing_factory | TEXT | 是 | - | need_review (default: '') |
| profileMaterialCode | profile_material_code | TEXT | 是 | - | need_review (default: '') |
| profileMaterialName | profile_material_name | TEXT | 是 | - | need_review (default: '') |
| unitUsage | unit_usage | INTEGER | 是 | - | need_review (default: 1) |
| safetyStock | safety_stock | INTEGER | 是 | - | need_review (default: 0) |
| warningStock | warning_stock | INTEGER | 是 | - | need_review (default: 0) |
| status | status | TEXT | 是 | 状态 | need_review (default: 'active') |
| remark | remark | TEXT | 是 | 备注 | need_review (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | need_review |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | need_review |

## products [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| name | name | TEXT | 是 | 名称 | keep |
| unit | unit | TEXT | 是 | - | keep (default: 'PCS') |
| process_route | process_route | TEXT | 是 | - | keep (default: '[]') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| created_at | created_at | TEXT | 是 | 创建时间 | keep |
| updated_at | updated_at | TEXT | 是 | 更新时间 | keep |
| project_id | project_id | TEXT | 否 | - | keep |
| party_id | party_id | TEXT | 否 | 关联已废弃的旧往来方表 parties | deprecated |
| project_code | project_code | TEXT | 否 | - | keep |
| factory | factory | TEXT | 是 | - | keep (default: '宜宾') |
| profile_code | profile_code | TEXT | 否 | - | keep |

## materials [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| name | name | TEXT | 是 | 名称 | keep |
| type | type | TEXT | 是 | - | keep (default: 'raw') |
| unit | unit | TEXT | 是 | - | keep (default: 'pcs') |
| spec | spec | TEXT | 是 | - | keep (default: '') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| created_at | created_at | TEXT | 是 | 创建时间 | keep |
| updated_at | updated_at | TEXT | 是 | 更新时间 | keep |

## processes [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| name | name | TEXT | 是 | 名称 | keep |
| sortOrder | sort_order | INTEGER | 是 | - | rename_later (default: 100) |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| isActive | is_active | INTEGER | 是 | - | rename_later (default: 1) |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## machines [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| name | name | TEXT | 是 | 名称 | keep |
| processId | process_id | TEXT | 否 | - | rename_later |
| status | status | TEXT | 是 | 状态 | keep (default: 'available') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| isActive | is_active | INTEGER | 是 | - | rename_later (default: 1) |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## work_orders [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| productionPlanId | production_plan_id | TEXT | 否 | - | rename_later |
| orderLineId | order_line_id | TEXT | 否 | 关联已废弃的旧订单表 order_line_id | deprecated |
| productId | product_id | TEXT | 是 | - | rename_later |
| materialId | material_id | TEXT | 否 | - | rename_later |
| customerName | customer_name | TEXT | 是 | - | rename_later (default: '') |
| projectName | project_name | TEXT | 是 | - | rename_later (default: '') |
| plannedQuantity | planned_quantity | INTEGER | 是 | - | rename_later |
| reportedQuantity | reported_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| goodQuantity | good_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| completedQuantity | completed_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| defectQuantity | defect_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| scrapQuantity | scrap_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| status | status | TEXT | 是 | 状态 | keep (default: 'created') |
| plannedStartDate | planned_start_date | TEXT | 是 | - | rename_later (default: '') |
| plannedFinishDate | planned_finish_date | TEXT | 是 | - | rename_later (default: '') |
| currentStepId | current_step_id | TEXT | 否 | - | rename_later |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |
| completedAt | completed_at | TEXT | 否 | - | rename_later |
| closedAt | closed_at | TEXT | 否 | - | rename_later |

## work_resources [未分类表 - 需评审]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | need_review (primary key) |
| productionPlanId | production_plan_id | TEXT | 否 | - | need_review |
| workOrderId | work_order_id | TEXT | 否 | - | need_review |
| processId | process_id | TEXT | 否 | - | need_review |
| machineId | machine_id | TEXT | 否 | - | need_review |
| plannedStartAt | planned_start_at | TEXT | 是 | - | need_review (default: '') |
| plannedFinishAt | planned_finish_at | TEXT | 是 | - | need_review (default: '') |
| status | status | TEXT | 是 | 状态 | need_review (default: 'planned') |
| notes | notes | TEXT | 是 | 备注 | need_review (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | need_review |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | need_review |

## work_order_steps [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| workOrderId | work_order_id | TEXT | 是 | - | rename_later |
| processId | process_id | TEXT | 否 | - | rename_later |
| stepOrder | step_order | INTEGER | 是 | - | rename_later |
| name | name | TEXT | 是 | 名称 | keep |
| plannedQuantity | planned_quantity | INTEGER | 是 | - | rename_later |
| completedQuantity | completed_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| defectQuantity | defect_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| scrapQuantity | scrap_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| status | status | TEXT | 是 | 状态 | keep (default: 'pending') |
| machineId | machine_id | TEXT | 否 | - | rename_later |
| startedAt | started_at | TEXT | 否 | - | rename_later |
| completedAt | completed_at | TEXT | 否 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## production_reports [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| workOrderId | work_order_id | TEXT | 是 | - | deprecated |
| stepId | step_id | TEXT | 是 | - | deprecated |
| processId | process_id | TEXT | 否 | - | deprecated |
| machineId | machine_id | TEXT | 否 | - | deprecated |
| operatorName | operator_name | TEXT | 是 | - | deprecated (default: '') |
| reportQty | report_qty | INTEGER | 是 | - | deprecated (default: 0) |
| goodQty | good_qty | INTEGER | 是 | - | deprecated (default: 0) |
| defectQty | defect_qty | INTEGER | 是 | - | deprecated (default: 0) |
| scrapQty | scrap_qty | INTEGER | 是 | - | deprecated (default: 0) |
| startedAt | started_at | TEXT | 否 | - | deprecated |
| endedAt | ended_at | TEXT | 否 | - | deprecated |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |

## process_cards [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| cardCode | card_code | TEXT | 是 | - | rename_later (unique) |
| productionOrderId | production_order_id | TEXT | 是 | - | rename_later |
| productId | product_id | TEXT | 否 | - | rename_later |
| productName | product_name | TEXT | 是 | - | rename_later (default: '') |
| productCode | product_code | TEXT | 是 | - | rename_later (default: '') |
| drawingNo | drawing_no | TEXT | 是 | - | rename_later (default: '') |
| unit | unit | TEXT | 是 | - | keep (default: 'pcs') |
| cardQty | card_qty | INTEGER | 是 | - | rename_later |
| currentOperationId | current_operation_id | TEXT | 否 | - | rename_later |
| currentOperation | current_operation | TEXT | 是 | - | rename_later (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'created') |
| printedAt | printed_at | TEXT | 否 | - | rename_later |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| remarks | remarks | TEXT | 是 | 备注 | keep (default: '') |
| processHint | process_hint | TEXT | 是 | - | rename_later (default: '') |
| specialRemarks | special_remarks | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |
| voidedAt | voided_at | TEXT | 否 | - | rename_later |

## route_operations [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| cardId | card_id | TEXT | 是 | - | deprecated |
| operationId | operation_id | TEXT | 否 | - | deprecated |
| operationCode | operation_code | TEXT | 是 | - | deprecated (default: '') |
| operationName | operation_name | TEXT | 是 | - | deprecated |
| sequence | sequence | INTEGER | 是 | - | deprecated |
| plannedQty | planned_qty | INTEGER | 是 | - | deprecated |
| goodQty | good_qty | INTEGER | 是 | - | deprecated (default: 0) |
| defectQty | defect_qty | INTEGER | 是 | - | deprecated (default: 0) |
| scrapQty | scrap_qty | INTEGER | 是 | - | deprecated (default: 0) |
| reworkQty | rework_qty | INTEGER | 是 | - | deprecated (default: 0) |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'pending') |
| startedAt | started_at | TEXT | 否 | - | deprecated |
| completedAt | completed_at | TEXT | 否 | - | deprecated |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## operation_reports [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| reportNo | report_no | TEXT | 是 | - | rename_later (unique) |
| cardId | card_id | TEXT | 是 | - | rename_later |
| cardCode | card_code | TEXT | 是 | - | rename_later |
| productionOrderId | production_order_id | TEXT | 是 | - | rename_later |
| operationId | operation_id | TEXT | 是 | - | rename_later |
| operationName | operation_name | TEXT | 是 | - | rename_later |
| reportType | report_type | TEXT | 是 | - | rename_later |
| goodQty | good_qty | INTEGER | 是 | - | rename_later (default: 0) |
| defectQty | defect_qty | INTEGER | 是 | - | rename_later (default: 0) |
| scrapQty | scrap_qty | INTEGER | 是 | - | rename_later (default: 0) |
| reworkQty | rework_qty | INTEGER | 是 | - | rename_later (default: 0) |
| operator | operator | TEXT | 是 | - | keep (default: '') |
| inspector | inspector | TEXT | 是 | - | keep (default: '') |
| equipment | equipment | TEXT | 是 | - | keep (default: '') |
| defectReason | defect_reason | TEXT | 是 | - | rename_later (default: '') |
| manualReason | manual_reason | TEXT | 是 | - | rename_later (default: '') |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## quality_abnormal_records [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| abnormalNo | abnormal_no | TEXT | 是 | - | deprecated (unique) |
| cardId | card_id | TEXT | 是 | - | deprecated |
| reportId | report_id | TEXT | 是 | - | deprecated |
| cardCode | card_code | TEXT | 是 | - | deprecated |
| operationId | operation_id | TEXT | 是 | - | deprecated |
| operationName | operation_name | TEXT | 是 | - | deprecated |
| abnormalType | abnormal_type | TEXT | 是 | - | deprecated |
| quantity | quantity | INTEGER | 是 | - | deprecated |
| reason | reason | TEXT | 是 | - | deprecated (default: '') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'open') |
| handlingMethod | handling_method | TEXT | 是 | - | deprecated (default: '') |
| handledBy | handled_by | TEXT | 是 | - | deprecated (default: '') |
| handledAt | handled_at | TEXT | 否 | - | deprecated |
| remark | remark | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## wip_transactions [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| cardId | card_id | TEXT | 是 | - | rename_later |
| reportId | report_id | TEXT | 否 | - | rename_later |
| cardCode | card_code | TEXT | 是 | - | rename_later |
| operationId | operation_id | TEXT | 否 | - | rename_later |
| operationName | operation_name | TEXT | 是 | - | rename_later (default: '') |
| transactionType | transaction_type | TEXT | 是 | - | rename_later |
| qtyDelta | qty_delta | INTEGER | 是 | - | rename_later (default: 0) |
| qtyAfter | qty_after | INTEGER | 是 | - | rename_later (default: 0) |
| fromOperation | from_operation | TEXT | 是 | - | rename_later (default: '') |
| toOperation | to_operation | TEXT | 是 | - | rename_later (default: '') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## inventory_balances [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| itemId | item_id | TEXT | 是 | - | rename_later |
| itemCode | item_code | TEXT | 是 | - | rename_later (default: '') |
| itemName | item_name | TEXT | 是 | - | rename_later (default: '') |
| itemType | item_type | TEXT | 是 | - | rename_later (default: '') |
| projectId | project_id | TEXT | 否 | - | rename_later |
| projectCode | project_code | TEXT | 是 | - | rename_later (default: '') |
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later |
| customerName | customer_name | TEXT | 是 | - | rename_later (default: '') |
| warehouseId | warehouse_id | TEXT | 否 | - | rename_later |
| warehouseName | warehouse_name | TEXT | 是 | - | rename_later (default: '') |
| locationId | location_id | TEXT | 否 | - | rename_later |
| locationCode | location_code | TEXT | 是 | - | rename_later (default: '') |
| inventoryStatus | inventory_status | TEXT | 是 | - | rename_later (default: 'available') |
| quantity | quantity | INTEGER | 是 | - | keep (default: 0) |
| unit | unit | TEXT | 是 | - | keep (default: 'pcs') |
| sourceNo | source_no | TEXT | 是 | - | rename_later (default: '') |
| lastTransactionAt | last_transaction_at | TEXT | 否 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## inventory_transactions [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| transactionNo | transaction_no | TEXT | 是 | - | rename_later |
| itemId | item_id | TEXT | 是 | - | rename_later |
| itemCode | item_code | TEXT | 是 | - | rename_later (default: '') |
| itemName | item_name | TEXT | 是 | - | rename_later (default: '') |
| itemType | item_type | TEXT | 是 | - | rename_later (default: '') |
| projectId | project_id | TEXT | 否 | - | rename_later |
| projectCode | project_code | TEXT | 是 | - | rename_later (default: '') |
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later |
| customerName | customer_name | TEXT | 是 | - | rename_later (default: '') |
| warehouseId | warehouse_id | TEXT | 否 | - | rename_later |
| warehouseName | warehouse_name | TEXT | 是 | - | rename_later (default: '') |
| locationId | location_id | TEXT | 否 | - | rename_later |
| locationCode | location_code | TEXT | 是 | - | rename_later (default: '') |
| transactionType | transaction_type | TEXT | 是 | - | rename_later |
| quantityChange | quantity_change | INTEGER | 是 | - | rename_later |
| beforeQuantity | before_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| afterQuantity | after_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| fromStatus | from_status | TEXT | 是 | - | rename_later (default: '') |
| toStatus | to_status | TEXT | 是 | - | rename_later (default: '') |
| sourceType | source_type | TEXT | 是 | - | rename_later |
| sourceId | source_id | TEXT | 是 | - | rename_later |
| sourceNo | source_no | TEXT | 是 | - | rename_later (default: '') |
| operatorId | operator_id | TEXT | 是 | - | rename_later (default: '') |
| operatorName | operator_name | TEXT | 是 | - | rename_later (default: '') |
| occurredAt | occurred_at | TEXT | 是 | - | rename_later |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## inventory_holds [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| holdNo | hold_no | TEXT | 是 | - | rename_later |
| itemId | item_id | TEXT | 是 | - | rename_later |
| itemCode | item_code | TEXT | 是 | - | rename_later (default: '') |
| itemName | item_name | TEXT | 是 | - | rename_later (default: '') |
| projectId | project_id | TEXT | 否 | - | rename_later |
| projectCode | project_code | TEXT | 是 | - | rename_later (default: '') |
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later |
| customerName | customer_name | TEXT | 是 | - | rename_later (default: '') |
| warehouseId | warehouse_id | TEXT | 是 | - | rename_later |
| warehouseName | warehouse_name | TEXT | 是 | - | rename_later (default: '') |
| locationId | location_id | TEXT | 否 | - | rename_later |
| locationCode | location_code | TEXT | 是 | - | rename_later (default: '') |
| holdQuantity | hold_quantity | INTEGER | 是 | - | rename_later |
| processedQuantity | processed_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| remainingQuantity | remaining_quantity | INTEGER | 是 | - | rename_later |
| abnormalType | abnormal_type | TEXT | 是 | - | rename_later (default: '') |
| discoveryStage | discovery_stage | TEXT | 是 | - | rename_later (default: '') |
| responsibleParty | responsible_party | TEXT | 是 | - | rename_later (default: '') |
| handlingPlan | handling_plan | TEXT | 是 | - | rename_later (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'pending') |
| initiatorId | initiator_id | TEXT | 是 | - | rename_later (default: '') |
| handlerId | handler_id | TEXT | 是 | - | rename_later (default: '') |
| foundAt | found_at | TEXT | 否 | - | rename_later |
| expectedCloseAt | expected_close_at | TEXT | 否 | - | rename_later |

## operation_logs [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| actor | actor | TEXT | 是 | - | keep (default: '') |
| action | action | TEXT | 是 | - | keep |
| entityType | entity_type | TEXT | 是 | - | rename_later |
| entityId | entity_id | TEXT | 是 | - | rename_later |
| detail | detail | TEXT | 是 | - | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## parties [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| code | code | TEXT | 是 | 编码 | deprecated (unique) |
| name | name | TEXT | 是 | 名称 | deprecated |
| type | type | TEXT | 是 | - | deprecated (default: 'customer') |
| contact | contact | TEXT | 是 | - | deprecated (default: '') |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'active') |
| created_at | created_at | TEXT | 是 | 创建时间 | deprecated |
| updated_at | updated_at | TEXT | 是 | 更新时间 | deprecated |

## customer_orders [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| code | code | TEXT | 是 | 编码 | deprecated |
| customerId | customer_id | TEXT | 否 | 主键 ID | deprecated |
| customerName | customer_name | TEXT | 是 | - | deprecated (default: '') |
| sourceType | source_type | TEXT | 是 | - | deprecated (default: 'manual') |
| sourceFileName | source_file_name | TEXT | 是 | - | deprecated (default: '') |
| demandVersion | demand_version | INTEGER | 是 | - | deprecated (default: 1) |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'imported') |
| requestedDate | requested_date | TEXT | 是 | - | deprecated (default: '') |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## customer_order_items [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| orderId | order_id | TEXT | 是 | - | deprecated |
| demandVersion | demand_version | INTEGER | 是 | - | deprecated (default: 1) |
| productId | product_id | TEXT | 否 | - | deprecated |
| productCode | product_code | TEXT | 是 | - | deprecated (default: '') |
| productName | product_name | TEXT | 是 | - | deprecated (default: '') |
| materialId | material_id | TEXT | 否 | - | deprecated |
| quantity | quantity | INTEGER | 是 | - | deprecated |
| deliveredQuantity | delivered_quantity | INTEGER | 是 | - | deprecated (default: 0) |
| dueDate | due_date | TEXT | 是 | - | deprecated (default: '') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'open') |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## demand_plan_versions [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| orderId | order_id | TEXT | 是 | - | rename_later |
| version | version | INTEGER | 是 | - | keep |
| importedBy | imported_by | TEXT | 是 | - | rename_later (default: '') |
| changeSummary | change_summary | TEXT | 是 | - | rename_later (default: '') |
| rawPayload | raw_payload | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## material_receipts [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| code | code | TEXT | 是 | 编码 | deprecated |
| materialId | material_id | TEXT | 是 | - | deprecated |
| orderItemId | order_item_id | TEXT | 否 | - | deprecated |
| supplierName | supplier_name | TEXT | 是 | - | deprecated (default: '') |
| warehouseCode | warehouse_code | TEXT | 是 | - | deprecated (default: 'MAIN') |
| batchNo | batch_no | TEXT | 是 | - | deprecated (default: '') |
| quantity | quantity | INTEGER | 是 | - | deprecated |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'received') |
| receivedBy | received_by | TEXT | 是 | - | deprecated (default: '') |
| receivedAt | received_at | TEXT | 是 | - | deprecated |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## material_delivery_plans [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| materialId | material_id | TEXT | 是 | - | rename_later |
| materialName | material_name | TEXT | 是 | - | rename_later (default: '') |
| supplierName | supplier_name | TEXT | 是 | - | rename_later (default: '') |
| quantity | quantity | INTEGER | 是 | - | keep |
| plannedShipAt | planned_ship_at | TEXT | 是 | - | rename_later (default: '') |
| estimatedArrivalAt | estimated_arrival_at | TEXT | 是 | - | rename_later (default: '') |
| actualArrivalAt | actual_arrival_at | TEXT | 是 | - | rename_later (default: '') |
| logisticsTrackingNo | logistics_tracking_no | TEXT | 是 | - | rename_later (default: '') |
| vehicleInfo | vehicle_info | TEXT | 是 | - | rename_later (default: '') |
| delayReason | delay_reason | TEXT | 是 | - | rename_later (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'pending') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## warehouse_receipts [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| code | code | TEXT | 是 | 编码 | deprecated |
| materialDeliveryPlanId | material_delivery_plan_id | TEXT | 是 | - | deprecated |
| materialId | material_id | TEXT | 是 | - | deprecated |
| materialName | material_name | TEXT | 是 | - | deprecated (default: '') |
| supplierName | supplier_name | TEXT | 是 | - | deprecated (default: '') |
| warehouseCode | warehouse_code | TEXT | 是 | - | deprecated (default: 'MAIN') |
| batchNo | batch_no | TEXT | 是 | - | deprecated (default: '') |
| quantity | quantity | INTEGER | 是 | - | deprecated |
| receivedAt | received_at | TEXT | 是 | - | deprecated (default: '') |
| receivedBy | received_by | TEXT | 是 | - | deprecated (default: '') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'received') |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## production_plans [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| title | title | TEXT | 是 | - | keep |
| planDate | plan_date | TEXT | 是 | - | rename_later |
| orderLineId | order_line_id | TEXT | 否 | 关联已废弃的旧订单表 order_line_id | deprecated |
| projectCode | project_code | TEXT | 否 | - | rename_later |
| productCode | product_code | TEXT | 否 | - | rename_later |
| materialCode | material_code | TEXT | 否 | - | rename_later |
| planPeriod | plan_period | TEXT | 否 | - | rename_later |
| projectId | project_id | TEXT | 否 | - | rename_later |
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later |
| productId | product_id | TEXT | 否 | - | rename_later |
| materialId | material_id | TEXT | 否 | - | rename_later |
| planQty | plan_qty | INTEGER | 是 | - | rename_later (default: 0) |
| plannedQuantity | planned_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| dueDate | due_date | TEXT | 是 | - | rename_later (default: '') |
| priority | priority | TEXT | 是 | - | keep (default: 'medium') |
| plannedStartAt | planned_start_at | TEXT | 是 | - | rename_later (default: '') |
| plannedFinishAt | planned_finish_at | TEXT | 是 | - | rename_later (default: '') |
| materialReadyStatus | material_ready_status | TEXT | 是 | - | rename_later (default: 'unknown') |
| riskLevel | risk_level | TEXT | 是 | - | rename_later (default: 'medium') |
| status | status | TEXT | 是 | 状态 | keep (default: 'draft') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| releasedAt | released_at | TEXT | 否 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## production_plan_items [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| planId | plan_id | TEXT | 是 | - | rename_later |
| orderItemId | order_item_id | TEXT | 否 | 关联已废弃的旧订单表 order_item_id | deprecated |
| productId | product_id | TEXT | 是 | - | rename_later |
| materialId | material_id | TEXT | 否 | - | rename_later |
| plannedQuantity | planned_quantity | INTEGER | 是 | - | rename_later |
| machineId | machine_id | TEXT | 否 | - | rename_later |
| plannedStartDate | planned_start_date | TEXT | 是 | - | rename_later (default: '') |
| plannedFinishDate | planned_finish_date | TEXT | 是 | - | rename_later (default: '') |
| status | status | TEXT | 是 | 状态 | keep (default: 'draft') |
| workOrderId | work_order_id | TEXT | 否 | - | rename_later |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## delivery_plans [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| orderId | order_id | TEXT | 否 | 关联已废弃的旧订单表 order_id | deprecated |
| plannedShipDate | planned_ship_date | TEXT | 是 | - | rename_later |
| status | status | TEXT | 是 | 状态 | keep (default: 'draft') |
| riskLevel | risk_level | TEXT | 是 | - | rename_later (default: 'low') |
| riskReason | risk_reason | TEXT | 是 | - | rename_later (default: '') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## delivery_plan_items [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| deliveryPlanId | delivery_plan_id | TEXT | 是 | - | rename_later |
| orderItemId | order_item_id | TEXT | 否 | 关联已废弃的旧订单表 order_item_id | deprecated |
| productId | product_id | TEXT | 是 | - | rename_later |
| quantity | quantity | INTEGER | 是 | - | keep |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| riskReason | risk_reason | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## shipments [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| deliveryPlanId | delivery_plan_id | TEXT | 否 | - | rename_later |
| orderId | order_id | TEXT | 否 | 关联已废弃的旧订单表 order_id | deprecated |
| orderLineId | order_line_id | TEXT | 否 | 关联已废弃的旧订单表 order_line_id | deprecated |
| orderItemId | order_item_id | TEXT | 否 | 关联已废弃的旧订单表 order_item_id | deprecated |
| demandId | demand_id | TEXT | 否 | - | rename_later |
| demandLineId | demand_line_id | TEXT | 否 | - | rename_later |
| productId | product_id | TEXT | 否 | - | rename_later |
| warehouseCode | warehouse_code | TEXT | 是 | - | rename_later (default: 'MAIN') |
| locationCode | location_code | TEXT | 是 | - | rename_later (default: '') |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| quantity | quantity | INTEGER | 是 | - | keep (default: 0) |
| status | status | TEXT | 是 | 状态 | keep (default: 'created') |
| shippedAt | shipped_at | TEXT | 否 | - | rename_later |
| confirmedBy | confirmed_by | TEXT | 是 | - | rename_later (default: '') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## shipment_items [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| shipmentId | shipment_id | TEXT | 是 | - | rename_later |
| orderItemId | order_item_id | TEXT | 否 | 关联已废弃的旧订单表 order_item_id | deprecated |
| productId | product_id | TEXT | 是 | - | rename_later |
| quantity | quantity | INTEGER | 是 | - | keep |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## quality_issues [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| sourceType | source_type | TEXT | 是 | - | rename_later (default: 'manual') |
| sourceId | source_id | TEXT | 是 | - | rename_later (default: '') |
| orderId | order_id | TEXT | 否 | 关联已废弃的旧订单表 order_id | deprecated |
| orderItemId | order_item_id | TEXT | 否 | 关联已废弃的旧订单表 order_item_id | deprecated |
| workOrderId | work_order_id | TEXT | 否 | - | rename_later |
| materialId | material_id | TEXT | 否 | - | rename_later |
| productId | product_id | TEXT | 否 | - | rename_later |
| severity | severity | TEXT | 是 | - | keep (default: 'medium') |
| status | status | TEXT | 是 | 状态 | keep (default: 'open') |
| title | title | TEXT | 是 | - | keep |
| description | description | TEXT | 是 | - | keep (default: '') |
| quantity | quantity | INTEGER | 是 | - | keep (default: 0) |
| freezeId | freeze_id | TEXT | 否 | - | rename_later |
| inventoryLockId | inventory_lock_id | TEXT | 否 | - | rename_later |
| handlingMethod | handling_method | TEXT | 是 | - | rename_later (default: '') |
| warehouseCode | warehouse_code | TEXT | 是 | - | rename_later (default: 'MAIN') |
| locationCode | location_code | TEXT | 是 | - | rename_later (default: '') |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| owner | owner | TEXT | 是 | - | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |
| closedAt | closed_at | TEXT | 否 | - | rename_later |

## issue_actions [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| issueId | issue_id | TEXT | 是 | - | rename_later |
| action | action | TEXT | 是 | - | keep |
| message | message | TEXT | 是 | - | keep (default: '') |
| actor | actor | TEXT | 是 | - | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## supply_chain_events [未分类表 - 需评审]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | need_review (primary key) |
| orderId | order_id | TEXT | 否 | - | need_review |
| entityType | entity_type | TEXT | 是 | - | need_review |
| entityId | entity_id | TEXT | 是 | - | need_review |
| eventType | event_type | TEXT | 是 | - | need_review |
| message | message | TEXT | 是 | - | need_review (default: '') |
| actor | actor | TEXT | 是 | - | need_review (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | need_review |

## projects [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| name | name | TEXT | 是 | 名称 | keep |
| party_id | party_id | TEXT | 否 | 关联已废弃的旧往来方表 parties | deprecated |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| created_at | created_at | TEXT | 是 | 创建时间 | keep |
| updated_at | updated_at | TEXT | 是 | 更新时间 | keep |

## product_materials [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| product_id | product_id | TEXT | 是 | - | keep |
| material_id | material_id | TEXT | 是 | - | keep |
| quantity | quantity | INTEGER | 是 | - | keep (default: 1) |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| created_at | created_at | TEXT | 是 | 创建时间 | keep |
| updated_at | updated_at | TEXT | 是 | 更新时间 | keep |

## attachments [未分类表 - 需评审]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | need_review (primary key) |
| entity_type | entity_type | TEXT | 是 | - | need_review |
| entity_id | entity_id | TEXT | 是 | - | need_review |
| file_name | file_name | TEXT | 是 | - | need_review |
| content_type | content_type | TEXT | 是 | - | need_review (default: '') |
| r2_key | r2_key | TEXT | 是 | - | need_review |
| size_bytes | size_bytes | INTEGER | 是 | - | need_review (default: 0) |
| status | status | TEXT | 是 | 状态 | need_review (default: 'active') |
| created_at | created_at | TEXT | 是 | 创建时间 | need_review |
| updated_at | updated_at | TEXT | 是 | 更新时间 | need_review |

## customer_demand_lines [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| code | code | TEXT | 是 | 编码 | deprecated (unique) |
| partyId | party_id | TEXT | 是 | - | deprecated |
| projectId | project_id | TEXT | 否 | - | deprecated |
| productId | product_id | TEXT | 是 | - | deprecated |
| quantity | quantity | INTEGER | 是 | - | deprecated |
| dueDate | due_date | TEXT | 是 | - | deprecated |
| priority | priority | TEXT | 是 | - | deprecated (default: 'medium') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'new') |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## order_lines [已废弃表 - 禁止写入]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | deprecated (primary key) |
| code | code | TEXT | 是 | 编码 | deprecated (unique) |
| demandLineId | demand_line_id | TEXT | 否 | - | deprecated |
| partyId | party_id | TEXT | 是 | - | deprecated |
| projectId | project_id | TEXT | 否 | - | deprecated |
| productId | product_id | TEXT | 是 | - | deprecated |
| quantity | quantity | INTEGER | 是 | - | deprecated |
| deliveredQty | delivered_qty | INTEGER | 是 | - | deprecated (default: 0) |
| dueDate | due_date | TEXT | 是 | - | deprecated |
| priority | priority | TEXT | 是 | - | deprecated (default: 'medium') |
| status | status | TEXT | 是 | 状态 | deprecated (default: 'draft') |
| notes | notes | TEXT | 是 | 备注 | deprecated (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | deprecated |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | deprecated |

## customer_demands [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep |
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later |
| customerName | customer_name | TEXT | 是 | - | rename_later (default: '') |
| sourceType | source_type | TEXT | 是 | - | rename_later (default: 'manual') |
| sourceFileName | source_file_name | TEXT | 是 | - | rename_later (default: '') |
| demandVersion | demand_version | INTEGER | 是 | - | rename_later (default: 1) |
| status | status | TEXT | 是 | 状态 | keep (default: 'imported') |
| requestedDate | requested_date | TEXT | 是 | - | rename_later (default: '') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## demand_lines [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| demandId | demand_id | TEXT | 是 | - | rename_later |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| customerId | customer_id | TEXT | 否 | 主键 ID | rename_later |
| customerName | customer_name | TEXT | 是 | - | rename_later (default: '') |
| projectCode | project_code | TEXT | 否 | - | rename_later |
| productId | product_id | TEXT | 否 | - | rename_later |
| productCode | product_code | TEXT | 是 | - | rename_later (default: '') |
| productName | product_name | TEXT | 是 | - | rename_later (default: '') |
| sourceType | source_type | TEXT | 是 | - | rename_later (default: 'manual') |
| quantity | quantity | INTEGER | 是 | - | keep |
| deliveredQuantity | delivered_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| unshippedQuantity | unshipped_quantity | INTEGER | 是 | - | rename_later (default: 0) |
| status | status | TEXT | 是 | 状态 | keep (default: 'confirmed') |
| dueDate | due_date | TEXT | 是 | - | rename_later (default: '') |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## production_demand_links [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| productionPlanId | production_plan_id | TEXT | 是 | - | rename_later |
| demandLineId | demand_line_id | TEXT | 是 | - | rename_later |
| quantity | quantity | INTEGER | 是 | - | keep |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |

## warehouses [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| name | name | TEXT | 是 | 名称 | keep |
| type | type | TEXT | 是 | - | keep (default: 'normal') |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## locations [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| warehouseCode | warehouse_code | TEXT | 是 | - | rename_later |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| name | name | TEXT | 是 | 名称 | keep |
| status | status | TEXT | 是 | 状态 | keep (default: 'active') |
| remark | remark | TEXT | 是 | 备注 | keep (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## receipts [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| sourceType | source_type | TEXT | 是 | - | rename_later (default: 'manual') |
| status | status | TEXT | 是 | 状态 | keep (default: 'draft') |
| receivedDate | received_date | TEXT | 是 | - | rename_later |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## receipt_items [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| receiptId | receipt_id | TEXT | 是 | - | rename_later |
| itemId | item_id | TEXT | 是 | - | rename_later |
| projectId | project_id | TEXT | 否 | - | rename_later |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| quantity | quantity | INTEGER | 是 | - | keep |
| warehouseId | warehouse_id | TEXT | 否 | - | rename_later |
| locationId | location_id | TEXT | 否 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## issues [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| sourceType | source_type | TEXT | 是 | - | rename_later (default: 'manual') |
| status | status | TEXT | 是 | 状态 | keep (default: 'draft') |
| issuedDate | issued_date | TEXT | 是 | - | rename_later |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## issue_items [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| issueId | issue_id | TEXT | 是 | - | rename_later |
| itemId | item_id | TEXT | 是 | - | rename_later |
| projectId | project_id | TEXT | 否 | - | rename_later |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| quantity | quantity | INTEGER | 是 | - | keep |
| warehouseId | warehouse_id | TEXT | 否 | - | rename_later |
| locationId | location_id | TEXT | 否 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## stocktakes [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| code | code | TEXT | 是 | 编码 | keep (unique) |
| warehouseCode | warehouse_code | TEXT | 是 | - | rename_later |
| status | status | TEXT | 是 | 状态 | keep (default: 'draft') |
| stocktakeDate | stocktake_date | TEXT | 是 | - | rename_later |
| notes | notes | TEXT | 是 | 备注 | keep (default: '') |
| createdBy | created_by | TEXT | 是 | - | rename_later (default: '') |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

## stocktake_items [V1 启用表]

| 字段 (JS) | 物理字段 (DB) | 类型 | 是否必填 | 说明 | 备注 |
|---|---|---|---|---|---|
| id | id | TEXT | 否 | 主键 ID | keep (primary key) |
| stocktakeId | stocktake_id | TEXT | 是 | - | rename_later |
| itemId | item_id | TEXT | 是 | - | rename_later |
| projectId | project_id | TEXT | 否 | - | rename_later |
| batchNo | batch_no | TEXT | 是 | - | rename_later (default: '') |
| systemQty | system_qty | INTEGER | 是 | - | rename_later |
| actualQty | actual_qty | INTEGER | 是 | - | rename_later |
| diffQty | diff_qty | INTEGER | 是 | - | rename_later |
| locationId | location_id | TEXT | 否 | - | rename_later |
| createdAt | created_at | TEXT | 是 | 创建时间 | rename_later |
| updatedAt | updated_at | TEXT | 是 | 更新时间 | rename_later |

