# 废弃表使用审计报告

本文档审计了 Dday V1 中被标记为已废弃 (deprecated) 的 11 张数据表在当前代码库中的实际引用情况，并明确了后续迁移和清退路径。

---

## 1. customer_orders

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义，重构完成前保留 |
| [index.ts](file:///d:/Dday/src/index.ts) | 读 | API 入口初始化 (COUNT 校验) | 否 | 入口状态健康检查，后续删除即可 |
| [order-flow.service.ts](file:///d:/Dday/src/services/order-flow.service.ts) | 写 | `updatePlan` / `releasePlan` | 是 | 修改关联订单状态，需要迁移至需求表 `customer_demands` |
| [production-execution.service.ts](file:///d:/Dday/src/services/production-execution.service.ts) | 读 | `listPlans` / `getPlan` | 是 | 获取计划的订单信息，需要关联需求表 `customer_demands` |
| [production-execution.service.ts](file:///d:/Dday/src/services/production-execution.service.ts) | 写 | `releasePlan` | 是 | 发布计划时更新订单状态为 `in_production`，需迁移至需求表 |
| [supply-chain.service.ts](file:///d:/Dday/src/services/supply-chain.service.ts) | 读/写 | `createOrder` / `updateOrder` / `cancelOrder` / `getOrder` 等整个订单流管理函数 | 是 | 核心订单 API 逻辑，后续需要全部合并/迁移至需求池流程 |

---

## 2. customer_order_items

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义，重构完成前保留 |
| [order-flow.service.ts](file:///d:/Dday/src/services/order-flow.service.ts) | 读 | 关联引入 | 否 | 仅导入，未做实质查询，无影响 |
| [supply-chain.service.ts](file:///d:/Dday/src/services/supply-chain.service.ts) | 读/写 | `createOrder` (写入项) / `updateOrderItemStatus` / `getOrderItems` / `syncOrderItemStatus` | 是 | 订单明细的核心写入与状态同步逻辑，后续需全量迁移至需求明细 `demand_lines` |

---

## 3. customer_demand_lines

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | 仅在 schema 中定义，代码库没有任何逻辑引用，后续直接物理删除即可 |

---

## 4. order_lines

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义，重构完成前保留 |
| [production-execution.service.ts](file:///d:/Dday/src/services/production-execution.service.ts) | 读 | `listPlans` / `getPlan` / `createPlan` / `listWorkOrders` | 是 | 读取计划及工单引用的旧订单行信息，需迁移至需求明细行 `demand_lines` |
| [production-execution.service.ts](file:///d:/Dday/src/services/production-execution.service.ts) | 写 | `releasePlan` | 是 | 发布计划时更新订单行状态为 `planned`，需迁移至需求明细行 |

---

## 5. parties

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义，重构完成前保留 |
| [mes.service.ts](file:///d:/Dday/src/services/mes.service.ts) | 读/写 | `importWorkOrders` (解析客户名称并自动创建) | 是 | 需迁移至独立的 `customers` 表查询和自动写入 |
| [order-flow.service.ts](file:///d:/Dday/src/services/order-flow.service.ts) | 读/写 | `syncCustomer` (写入) / `listProducts` (关联读) | 是 | 需迁移为直接向 `customers` 同步数据 |
| [production-execution.service.ts](file:///d:/Dday/src/services/production-execution.service.ts) | 读 | `listPlans` / `getPlan` / `releasePlan` | 是 | 读取计划及产品关联的往来方（客户），需迁移至直接关联 `customers` |
| [resource-api.service.ts](file:///d:/Dday/src/services/resource-api.service.ts) | 读/写 | `createCustomer` / `updateCustomer` / `deleteCustomer` / `getCustomer` 等客户 API 实现 | 是 | 所有的增删改查逻辑均由 parties 混杂维护，需重构为读写 `customers` 表 |
| [supply-chain.service.ts](file:///d:/Dday/src/services/supply-chain.service.ts) | 读/写 | `syncCustomer` | 是 | 需迁移为向 `customers` 写入 |

---

## 6. parts

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义，重构完成前保留 |
| [main.tsx](file:///d:/Dday/src/admin/main.tsx) | - | 前端路由资源配置 (parts) | 是 | 需要移除或重命名前端零件管理页面 |
| [index.ts](file:///d:/Dday/src/index.ts) | - | 路由挂载 (`/api/parts`) | 是 | 后续接口废弃，需移除此路由 |
| [parts.routes.ts](file:///d:/Dday/src/routes/parts.routes.ts) | 读/写 | 整个文件 API 接口路由定义 | 是 | 物理接口路由，待逻辑迁移完成后直接删除 |
| [resource-api.service.ts](file:///d:/Dday/src/services/resource-api.service.ts) | 读/写 | `createPart` / `updatePart` / `deletePart` / `listParts` / `listProjectParts` | 是 | 型材零件主数据接口逻辑，后续需要彻底由物料 `materials` 接口替代 |

---

## 7. material_receipts

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义 |
| [order-flow.service.ts](file:///d:/Dday/src/services/order-flow.service.ts) | 读/写 | `createMaterialReceipt` / `updateMaterialReceipt` / `listMaterialReceipts` / `getMaterialReceiptsByOrder` | 是 | 收货动作和收货列表查询，需迁移为标准仓储入库单 `receipts` / `receipt_items` 体系 |
| [supply-chain.service.ts](file:///d:/Dday/src/services/supply-chain.service.ts) | 读/写 | `createMaterialReceipt` / `getMaterialReceipts` | 是 | 供应链侧的收货，需重构为仓储入库逻辑 |

---

## 8. warehouse_receipts

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义 |
| [warehouse-receipts.routes.ts](file:///d:/Dday/src/routes/warehouse-receipts.routes.ts) | - | 接口挂载路由 | 是 | 旧收货入库接口路由，后续需整体下线并删除 |
| [material-delivery.service.ts](file:///d:/Dday/src/services/material-delivery.service.ts) | 读/写 | `listWarehouseReceipts` / `createWarehouseReceipt` / `getWarehouseReceipt` | 是 | 到货确认并直接入库逻辑，后续需迁移为标准仓储入库单模型 |

---

## 9. quality_abnormal_records

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义 |
| [reporting.service.ts](file:///d:/Dday/src/services/reporting.service.ts) | 读/写 | `listAbnormalRecords` / `createAbnormalRecord` / `updateAbnormalRecord` / `getAbnormalRecordsByCard` | 是 | 报工时登记品质异常的逻辑，需整体迁移合并至 `quality_issues` / `issue_actions` 核心质量管理模块 |

---

## 10. route_operations

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义 |
| [reporting.service.ts](file:///d:/Dday/src/services/reporting.service.ts) | 读/写 | `createProcessCard` (写入工序) / `reportOperation` (更新工序良废数) / `getRouteOperationsByCard` | 是 | 卡片在车间流转的进度数据，必须重构为基于工单工序步骤 `work_order_steps` 的逻辑 |

---

## 11. production_reports

| 文件 | 读/写 | 函数 / 语句位置 | 是否需要迁移 | 说明 |
|---|---|---|---|---|
| [schema.ts](file:///d:/Dday/src/db/schema.ts) | - | 表结构定义 | 否 | Drizzle 表定义 |
| [production-execution.service.ts](file:///d:/Dday/src/services/production-execution.service.ts) | 读 | `syncProductionPlanStatus` | 是 | 校验工单报工记录数，需改为读取新工序报工表 `operation_reports` |
| [resource-api.service.ts](file:///d:/Dday/src/services/resource-api.service.ts) | 写 | `createProductionReport` | 是 | 遗留的简易工单报工接口，需要下线，统一向 `operation_reports` 进行工序级扫码报工 |
| [mes.service.ts](file:///d:/Dday/src/services/mes.service.ts) | 读/写 | `reportProduction` / `getProductionReports` / `getProductionReportDetail` | 是 | 旧工单报工接口，需向基于工艺卡的 `operation_reports` 接口合并迁移 |
