# Dday V1 数据库锁定文档

- 本文件是 Dday V1 数据库结构的唯一权威版本。
- `DATABASE_CORE_FIELDS_V1_DRAFT.md` 和 `DATABASE_OPERATION_FIELDS_V1_DRAFT.md` 只作为历史草案保留。
- Codex 后续不得绕过本文件自行新增、删除、修改数据库表和字段。
- 任何数据库变更必须先提交数据库变更申请。
- 2026-05-23 开发期已执行 V1 快速重建对齐，当前 baseline migration 为 `migrations/0001_v1_baseline.sql`；后续仍以本文档为唯一权威依据。

---

## 1. 数据库锁定原则

- **架构优先固定**: Dday V1 采用轻量 MES / ERP 模型。数据库结构优先固定，业务开发必须围绕既定表结构进行。
- **防止重复建表**: 不允许同一业务对象重复建表。不允许 Codex 随功能开发自行新增表。
- **库存动作留痕**: 不允许业务模块直接修改库存余额（`inventory_balances`）。所有库存变化必须通过 `InventoryLedgerService` 统一写入库存余额和库存流水。
- **快照与事实分离**: 业务单据允许保留历史快照字段，例如 `productCode`、`productName`、`customerName`、`itemCode`、`itemName`。主数据是事实源，业务单据中的名称和编码是历史快照，不作为唯一事实源。
- **批次追踪弱化**: 当前 V1 不强制批次追踪，`batchNo` 作为选填追溯字段保留。

---

## 2. Dday V1 核心业务主线

Dday V1 的核心业务单据及状态流转路径如下：

```
客户需求行 demand_lines
  → 生产计划 production_plans
  → 工单 work_orders
  → 工序步骤 work_order_steps
  → 报工 operation_reports
  → 库存流水 inventory_transactions
  → 发货 shipments / shipment_items
  → 需求关闭
```

- `customer_demands` 是需求批次主表。
- `demand_lines` 是生产、排产、发货追踪的源头。
- `production_demand_links` 是生产计划与需求行的唯一可信关联。
- `production_plans.orderLineId` 不再作为新逻辑来源。
- `work_orders.orderLineId` 不再作为新逻辑来源。
- 发货短期可兼容 `shipments.demandLineId`。
- 启用 `shipment_items` 后，发货回写需求行以 `shipment_items.demandLineId` 为准。

---

## 3. V1 允许使用的表清单

### 3.1 系统权限 (5张)
- **`users`**: 系统用户表。用于系统登录、身份标识与基础权限分配。
- **`roles`**: 角色定义表。定义系统不同的角色身份（如管理员、查看者、操作员等）。
- **`permissions`**: 权限点定义表。细粒度控制前端路由与后端 API 访问。
- **`role_permissions`**: 角色权限关联表。维护角色与具体权限点的多对多关系。
- **`operation_logs`**: 操作日志表。记录关键单据的创建、修改和删除等行为，用于审计。

### 3.2 主数据 (9张)
- **`customers`**: 客户资料表。保存客户的名称、简称、联系人、电话、送货地址等基础信息。
- **`profile_suppliers`**: 供应商资料表。保存型材厂/供应商的资料及默认采购交期。
- **`manufacturing_factories`**: 生产工厂主数据表。用于多工厂或多车间的基础资料管理。
- **`projects`**: 项目资料表。保存内部或外部的项目编码、名称和关联项目负责人。
- **`products`**: 产品主数据表。包括产品编码、名称、图号、工艺路线等，是订单和排产的核心基础。
- **`materials`**: 物料资料表。包括原材料、辅助材料或零部件的基础数据。
- **`product_materials`**: 产品 BOM 关联表。记录生产某个产品所需的原材料及配比用量。
- **`processes`**: 工序表。定义生产工艺路线中的标准化步骤（如：切割、折弯、组装等）。
- **`machines`**: 设备表。维护车间中具体加工设备的设备编号、名称、所属工序等。

### 3.3 需求 / 订单 (4张)
- **`customer_demands`**: 客户需求主表。代表原始需求池，存放客户订单编码、交期及版本。
- **`demand_lines`**: 需求明细行表。具体每一条需求的产品、数量、已交付数及状态。
- **`demand_plan_versions`**: 需求版本控制表。保存导入需求文件时的原始负载和版本更新历史。
- **`production_demand_links`**: 生产计划-需求关联表。用于多对多连接排产计划与订单需求来源。

### 3.4 生产 (7张)
- **`production_plans`**: 生产计划主表。计划排产的产品、计划产量、交期和齐套性状态。
- **`production_plan_items`**: 生产计划明细表。记录某笔排产下的具体数量和分配设备。
- **`work_orders`**: 生产工单表。车间派产任务，跟踪计划量、报工量、良品量、报废量等。
- **`work_order_steps`**: 工单工序步骤表。将工单拆解为具体的工序流，跟踪工序完成及不良品数。
- **`process_cards`**: 周转工艺卡表。伴随实物在现场流转，包含图纸号和数量，用于扫码报工。
- **`operation_reports`**: 工序报工记录表。精细化记录每次扫码或手动填报的良品数、不良数、设备和报工人。
- **`wip_transactions`**: 在制品流水表。记录生产过程中在制品各工序间的移交、变动 Delta 值。

### 3.5 仓储 / 库存 (12张)
- **`warehouses`**: 仓库表。配置不同的实物仓库（如主料库、成品库、不良品库等）。
- **`locations`**: 库位表。仓库内部的具体货架或库位编码。
- **`inventory_balances`**: 库存余额表。核心账目，描述“某项目-某产品/物料-某库位-某状态”下的当前数量。
- **`inventory_transactions`**: 库存收发流水表。记录每一次库存动作（入库、出库、冻结、盘点），用于溯源审计。
- **`inventory_holds`**: 库存冻结锁定表。登记冻结数量、冻结原因（如品质异常、争议），执行锁定控制。
- **`receipts`**: 入库单主表。记录到货入库事务。
- **`receipt_items`**: 入库单明细表。入库物料明细、数量、批次。
- **`issues`**: 出库单主表。记录物料领用或出库事务。
- **`issue_items`**: 出库单明细表。出库物料明细、数量、批次。
- **`stocktakes`**: 盘点单主表。仓库定期盘点的任务单。
- **`stocktake_items`**: 盘点单明细表。实盘账面数量、实盘数量和差异量。
- **`material_delivery_plans`**: 型材到货计划表。保存供应商物料计划交付时间、跟踪单号和到货核销记录。

### 3.6 质量 (2张)
- **`quality_issues`**: 质量问题主数据表。记录来料/生产过程产生的品质异常及数量，挂载冻结ID。
- **`issue_actions`**: 质量处理跟进表。记录质量问题的处理步骤和动作历史。

### 3.7 发货 (4张)
- **`delivery_plans`**: 发货计划主表。面向客户交付的成品发货排期。
- **`delivery_plan_items`**: 发货计划明细表。发货批次、数量、产品明细。
- **`shipments`**: 发货单主表。记录正式成品发货出库凭证，扣减成品可用库存。
- **`shipment_items`**: 发货单明细表。发货产品明细与实发数量。

### 3.8 辅助 (2张)
- **`attachments`**: 辅助附件表。存放业务关联的文件附件、图纸元数据等。
- **`supply_chain_events`**: 供应链追溯事件表。记录追溯环节中的关键业务事件，用于全链路追溯。

---

## 4. Deprecated 表清单

以下 11 张表属于废弃表，在 V1 版本中**禁止写入任何新数据**：

1.  `parties`: 曾用于合并管理往来方，现由 `customers` 和 `profile_suppliers` 主数据表拆分替代。
2.  `parts`: 型材零件旧表，已由 `materials` 统一替代。
3.  `customer_orders`: 客户旧版订单主表，已由需求池主表 `customer_demands` 统一替代。
4.  `customer_order_items`: 客户旧版订单明细表，已由需求池明细 `demand_lines` 统一替代。
5.  `customer_demand_lines`: 旧的需求明细行扩展，已废弃。
6.  `order_lines`: 订单行标准化旧表，已被需求流和排产流剥离重组。
7.  `material_receipts`: 旧的型材到货收货历史表，由仓储 `receipts` / `receipt_items` 统一替代。
8.  `warehouse_receipts`: 旧的到货确认表，已被型材到货计划 `material_delivery_plans` 及收料入库功能接管。
9.  `quality_abnormal_records`: 旧的生产过程质量异常表，已由质量闭环表 `quality_issues` 统一替代。
10. `route_operations`: 周转卡工艺路线旧明细，已重构为 `work_order_steps` 执行流。
11. `production_reports`: 旧版的生产工单报工表，已由工序明细级报工 `operation_reports` 替代。

### 废弃表使用规则
- **旧代码只读兼容**: 废弃的旧表不立即从物理数据库中删除，旧功能只读场景下可作短期兼容。
- **新功能禁写禁读**: 新开发功能严禁继续向废弃表写入数据，且不能将其作为事实源。
- **完全清退必须申请**: 物理删除 deprecated 表必须另起数据库变更申请，进行全局代码审计后才可执行。

---

## 5. 字段状态定义

锁定文档及后续变更方案采用以下字段状态：

| 状态 | 含义 |
|---|---|
| keep | 字段保留，当前字段名和语义基本可接受 |
| rename_later | 字段语义可用，但字段名不准确，后续需要改名 |
| deprecated | 字段后续废弃，新逻辑不应继续依赖 |
| need_add | V1 应该补充该字段，但当前 schema 还没有 |
| need_review | 字段含义不清，需要人工确认 |

---

## 6. 核心表字段锁定

### 6.1 customers
* **业务定位**: 客户主数据表。全局唯一客户记录。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `customerId` | text | 是 | 客户主键ID | 无 | keep |
| `customerCode` | text | 后续新增时必填 | 客户业务编码 (如 CUST-001)；数据库物理列为 `customer_code` | 无 | need_add (v1_later) |
| `customerName` | text | 是 | 客户全称 | 无 | keep |
| `customerShortName` | text | 否 | 客户简称 | `''` | keep |
| `contactPerson` | text | 否 | 联系人 | `''` | keep |
| `contactPhone` | text | 否 | 联系电话 | `''` | keep |
| `deliveryAddress` | text | 否 | 默认送货地址 | `''` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.2 profile_suppliers
* **业务定位**: 型材厂商 / 供应商主数据表。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `supplierId` | text | 是 | 供应商唯一ID | 无 | keep |
| `supplierCode` | text | 后续新增时必填 | 供应商业务编码 (如 SUPP-001)；数据库物理列为 `supplier_code` | 无 | need_add (v1_later) |
| `supplierName` | text | 是 | 供应商名称 | 无 | keep |
| `supplierShortName` | text | 否 | 供应商简称 | `''` | keep |
| `contactPerson` | text | 否 | 联系人 | `''` | keep |
| `contactPhone` | text | 否 | 联系电话 | `''` | keep |
| `address` | text | 否 | 地址 | `''` | keep |
| `defaultLeadTime` | integer | 是 | 默认采购周期（天数） | `0` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.3 manufacturing_factories
* **业务定位**: 制造工厂主数据表。宜宾工厂、重庆工厂等。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `factoryId` | text | 是 | 工厂唯一ID | 无 | keep |
| `factoryName` | text | 是 | 工厂名称 | 无 | keep |
| `factoryCode` | text | 是 | 工厂编码 | 无 | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.4 projects
* **业务定位**: 客户项目主数据表。项目必须关联客户。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 项目唯一ID | 无 | keep |
| `code` | text | 是 | 项目编码 | 无 | keep |
| `name` | text | 是 | 项目名称 | 无 | keep |
| `customerId` | text | 是 | 关联客户ID；数据库物理列为 `customer_id` | 无 | rename_later (由 `party_id` 改名) |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.5 products
* **业务定位**: 交付给客户的产成品主数据。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 产品ID | 无 | keep |
| `code` | text | 是 | 产品编码 | 无 | keep |
| `name` | text | 是 | 产品名称 | 无 | keep |
| `unit` | text | 是 | 单位 | `'PCS'` | keep |
| `processRoute` | text | 否 | 工艺路线JSON；数据库物理列为 `process_route` | `'[]'` | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `projectId` | text | 否 | 项目ID；数据库物理列为 `project_id` | 无 | keep |
| `partyId` | text | 否 | 关联往来单位ID（已废弃） | 无 | deprecated |
| `factoryId` | text | 后续新增时必填 | 生产工厂ID；数据库物理列为 `factory_id` | 无 | need_add (v1_later) |
| `profileCode` | text | 否 | 默认型材编码（已废弃） | 无 | deprecated |
| `drawingNo` | text | 后续新增时选填 | 图纸版本号；数据库物理列为 `drawing_no` | `''` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.6 materials
* **业务定位**: 型材 / 原材料 / 辅料主数据表。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 物料主键ID | 无 | keep |
| `code` | text | 是 | 物料编码 | 无 | keep |
| `name` | text | 是 | 物料名称 | 无 | keep |
| `type` | text | 是 | 物料类型 | `'profile'` (profile / raw / accessory) | keep |
| `unit` | text | 是 | 单位 | `'pcs'` | keep |
| `spec` | text | 否 | 规格型号 | `''` | keep |
| `supplierId` | text | 后续新增时选填 | 默认供应商ID；数据库物理列为 `supplier_id` | 无 | need_add (v1_later) |
| `materialCategory` | text | 后续新增时选填 | 物料类别 (例如: 6系铝材)；数据库物理列为 `material_category` | `''` | need_add (v1_later) |
| `defaultLeadTime` | integer | 后续新增时必填 | 默认采购天数；数据库物理列为 `default_lead_time` | `0` | need_add (v1_later) |
| `safetyStock` | real | 后续新增时选填 | 安全库存量；数据库物理列为 `safety_stock` | `0.0` | need_add (v2) |
| `minPackQty` | real | 后续新增时选填 | 最小采购包装量；数据库物理列为 `min_pack_qty` | `0.0` | need_add (v2) |
| `reorderPoint` | real | 后续新增时选填 | 再订货点；数据库物理列为 `reorder_point` | `0.0` | need_add (v2) |
| `notes` | text | 否 | 备注 | `''` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.7 product_materials
* **业务定位**: 产品与物料 / 原材料的 BOM 关系表。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 记录唯一ID | 无 | keep |
| `productId` | text | 是 | 产品ID；数据库物理列为 `product_id` | 无 | keep |
| `materialId` | text | 是 | 物料ID；数据库物理列为 `material_id` | 无 | keep |
| `quantity` | integer | 是 | 单件产品消耗数量 | `1` | keep |
| `usageUnit` | text | 后续新增时选填 | 消耗单位；数据库物理列为 `usage_unit` | `'pcs'` | need_add (v1_later) |
| `lossRate` | real | 后续新增时必填 | 损耗率；数据库物理列为 `loss_rate` | `0.0` | need_add (v1_later) |
| `isPrimary` | integer | 后续新增时必填 | 是否为主型材 (0: 否, 1: 是)；数据库物理列为 `is_primary` | `1` | need_add (v1_later) |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `remark` | text | 后续新增时选填 | 备注说明 | `''` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.8 customer_demands
* **业务定位**: 客户需求导入批次主表。仅存放批次头信息，不表达产品明细。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 需求主表ID | 无 | keep |
| `code` | text | 是 | 需求编码 | 无 | keep |
| `customerId` | text | 是 | 关联客户ID；数据库物理列为 `customer_id` | 无 | keep |
| `customerName` | text | 否 | 客户名称历史快照；数据库物理列为 `customer_name` | `''` | keep |
| `sourceType` | text | 是 | 需求来源；数据库物理列为 `source_type` | `'manual'` (manual / excel_import) | keep |
| `sourceFileName` | text | 否 | 导入的文件名称；数据库物理列为 `source_file_name` | `''` | keep |
| `demandVersion` | integer | 是 | 需求版本号；数据库物理列为 `demand_version` | `1` | keep |
| `status` | text | 是 | 需求状态 | `'imported'` | keep |
| `requestedDate` | text | 否 | 要求交付日期；数据库物理列为 `requested_date` | `''` | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.9 demand_lines
* **业务定位**: 需求明细行表。系统排产、生产和发货跟踪的唯一明细源头。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 需求明细行ID | 无 | keep |
| `demandId` | text | 是 | 关联需求主表ID；数据库物理列为 `demand_id` | 无 | keep |
| `code` | text | 是 | 明细行编码 | 无 | keep |
| `customerId` | text | 是 | 客户ID；数据库物理列为 `customer_id` | 无 | keep |
| `customerName` | text | 否 | 客户名称快照；数据库物理列为 `customer_name` | `''` | keep |
| `projectId` | text | 后续新增时必填 | 关联项目ID；数据库物理列为 `project_id` | 无 | need_add (v1_later) |
| `productId` | text | 是 | 产品ID；数据库物理列为 `product_id` | 无 | keep |
| `productCode` | text | 否 | 产品编码快照；数据库物理列为 `product_code` | `''` | keep |
| `productName` | text | 否 | 产品名称快照；数据库物理列为 `product_name` | `''` | keep |
| `quantity` | integer | 是 | 销售下单数量 | 无 | keep |
| `requiredQuantity` | integer | 后续新增时必填 | 实际计算需求量；数据库物理列为 `required_quantity` | `0` | need_add (v1_later) |
| `plannedQuantity` | integer | 后续新增时必填 | 已排产数量；数据库物理列为 `planned_quantity` | `0` | need_add (v1_later) |
| `producedQuantity` | integer | 后续新增时必填 | 已报工合格数量；数据库物理列为 `produced_quantity` | `0` | need_add (v1_later) |
| `shippedQuantity` | integer | 是 | 已发货数量；数据库物理列为 `shipped_quantity` | `0` | rename_later (由 `deliveredQuantity` 改名) |
| `cancelledQuantity` | integer | 后续新增时选填 | 已取消数量；数据库物理列为 `cancelled_quantity` | `0` | need_add (v1_later) |
| `status` | text | 是 | 状态 | `'imported'` | keep |
| `dueDate` | text | 是 | 交期；数据库物理列为 `due_date` | 无 | keep |
| `priority` | text | 后续新增时必填 | 优先级 | `'medium'` (high/medium/low) | need_add (v1_later) |
| `sourceLineNo` | text | 后续新增时选填 | 导入的原始行号；数据库物理列为 `source_line_no` | `''` | need_add (v1_later) |
| `notes` | text | 否 | 备注 | `''` | keep |
| `closedAt` | text | 后续新增时选填 | 关闭时间；数据库物理列为 `closed_at` | 无 | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.10 production_plans
* **业务定位**: 生产排产计划主表。排产的产品、数量、交期，可对应单个或合并多个需求行。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 计划ID | 无 | keep |
| `code` | text | 是 | 计划编码 | 无 | keep |
| `title` | text | 是 | 计划标题 | 无 | keep |
| `planDate` | text | 是 | 计划日期；数据库物理列为 `plan_date` | 无 | keep |
| `orderLineId` | text | 否 | 关联行ID（已废弃）；数据库物理列为 `order_line_id` | 无 | deprecated |
| `projectId` | text | 否 | 项目ID；数据库物理列为 `project_id` | 无 | keep |
| `projectCode` | text | 否 | 项目编码快照；数据库物理列为 `project_code` | `''` | keep |
| `customerId` | text | 否 | 客户ID；数据库物理列为 `customer_id` | 无 | keep |
| `productId` | text | 是 | 产品ID；数据库物理列为 `product_id` | 无 | keep |
| `productCode` | text | 否 | 产品编码快照；数据库物理列为 `product_code` | `''` | keep |
| `materialId` | text | 否 | 主消耗型材ID；数据库物理列为 `material_id` | 无 | keep |
| `materialCode` | text | 否 | 原材料编码快照；数据库物理列为 `material_code` | `''` | keep |
| `factoryId` | text | 后续新增时必填 | 计划生产工厂ID；数据库物理列为 `factory_id` | 无 | need_add (v1_later) |
| `planType` | text | 后续新增时必填 | 计划排产类型；数据库物理列为 `plan_type` | `'normal'` | need_add (v1_later) |
| `plannedQuantity` | integer | 是 | 计划排产数量；数据库物理列为 `planned_quantity` | `0` | keep |
| `dueDate` | text | 是 | 截止交期；数据库物理列为 `due_date` | 无 | keep |
| `priority` | text | 是 | 优先级 | `'medium'` (high/medium/low) | keep |
| `plannedStartAt` | text | 是 | 计划开始时间；数据库物理列为 `planned_start_at` | 无 | keep |
| `plannedFinishAt` | text | 是 | 计划结束时间；数据库物理列为 `planned_finish_at` | 无 | keep |
| `materialReadyStatus` | text | 是 | 物料准备评估；数据库物理列为 `material_ready_status` | `'unknown'` | keep |
| `riskLevel` | text | 是 | 计划风险级别；数据库物理列为 `risk_level` | `'medium'` (high/medium/low) | keep |
| `status` | text | 是 | 状态 | `'draft'` | keep |
| `createdBy` | text | 否 | 创建人；数据库物理列为 `created_by` | `''` | keep |
| `releasedAt` | text | 否 | 发布时间；数据库物理列为 `released_at` | 无 | keep |
| `lockedAt` | text | 后续新增时选填 | 锁定时间；数据库物理列为 `locked_at` | 无 | need_add (v1_later) |
| `cancelledAt` | text | 后续新增时选填 | 取消时间；数据库物理列为 `cancelled_at` | 无 | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.11 work_orders
* **业务定位**: 生产执行工单主表。车间具体派工任务。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 工单主键 | 无 | keep |
| `code` | text | 是 | 工单单号 | 无 | keep |
| `productionPlanId` | text | 否 | 生产计划ID；数据库物理列为 `production_plan_id` | 无 | keep |
| `orderLineId` | text | 否 | 关联订单明细行ID（已废弃）；数据库物理列为 `order_line_id` | 无 | deprecated |
| `productId` | text | 是 | 产品ID；数据库物理列为 `product_id` | 无 | keep |
| `materialId` | text | 否 | 主型材物料ID；数据库物理列为 `material_id` | 无 | keep |
| `factoryId` | text | 后续新增时必填 | 工厂ID；数据库物理列为 `factory_id` | 无 | need_add (v1_later) |
| `plannedQuantity` | integer | 是 | 计划生产数；数据库物理列为 `planned_quantity` | `0` | keep |
| `reportedQuantity` | integer | 是 | 已报工总数；数据库物理列为 `reported_quantity` | `0` | keep |
| `goodQuantity` | integer | 是 | 合格品数；数据库物理列为 `good_quantity` | `0` | keep |
| `completedQuantity` | integer | 是 | 完工入库数量；数据库物理列为 `completed_quantity` | `0` | keep |
| `defectQuantity` | integer | 是 | 拦截不良品数；数据库物理列为 `defect_quantity` | `0` | keep |
| `scrapQuantity` | integer | 是 | 报废品数；数据库物理列为 `scrap_quantity` | `0` | keep |
| `processRouteSnapshot` | text | 否 | 工艺路线快照 (工单下发时固化)；数据库物理列为 `process_route_snapshot` | `'[]'` | need_add (v1_later) |
| `status` | text | 是 | 状态 | `'created'` | keep |
| `plannedStartDate` | text | 否 | 计划开始时间；数据库物理列为 `planned_start_date` | `''` | keep |
| `plannedFinishDate` | text | 否 | 计划结束时间；数据库物理列为 `planned_finish_date` | `''` | keep |
| `currentStepId` | text | 否 | 当前工位/工序；数据库物理列为 `current_step_id` | 无 | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `releasedAt` | text | 后续新增时选填 | 发布时间；数据库物理列为 `released_at` | 无 | need_add (v1_later) |
| `startedAt` | text | 后续新增时选填 | 实际开工时间；数据库物理列为 `started_at` | 无 | need_add (v1_later) |
| `completedAt` | text | 否 | 实际完工时间；数据库物理列为 `completed_at` | 无 | keep |
| `closedAt` | text | 否 | 实际关闭时间；数据库物理列为 `closed_at` | 无 | keep |
| `cancelledAt` | text | 后续新增时选填 | 取消时间；数据库物理列为 `cancelled_at` | 无 | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.12 inventory_balances
* **业务定位**: 库存余额汇总表。只允许由 `InventoryLedgerService` 执行动作写入。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 库存主键ID | 无 | keep |
| `itemId` | text | 是 | 产品ID / 物料ID；数据库物理列为 `item_id` | 无 | keep |
| `itemCode` | text | 否 | 物料编码缓存；数据库物理列为 `item_code` | `''` | keep |
| `itemName` | text | 否 | 物料名称缓存；数据库物理列为 `item_name` | `''` | keep |
| `itemType` | text | 是 | 物品类型；数据库物理列为 `item_type` | `'material'` | keep |
| `projectId` | text | 否 | 关联项目ID；数据库物理列为 `project_id` | 无 | keep |
| `projectCode` | text | 否 | 项目编码缓存；数据库物理列为 `project_code` | `''` | keep |
| `customerId` | text | 否 | 关联客户ID；数据库物理列为 `customer_id` | 无 | keep |
| `customerName` | text | 否 | 客户名称缓存；数据库物理列为 `customer_name` | `''` | keep |
| `warehouseId` | text | 是 | 仓库ID；数据库物理列为 `warehouse_id` | 无 | keep |
| `warehouseName` | text | 否 | 仓库名称缓存；数据库物理列为 `warehouse_name` | `''` | keep |
| `locationId` | text | 否 | 库位ID；数据库物理列为 `location_id` | 无 | keep |
| `locationCode` | text | 否 | 库位编码缓存；数据库物理列为 `location_code` | `''` | keep |
| `inventoryStatus` | text | 是 | 库存状态枚举；数据库物理列为 `inventory_status` | `'available'` | keep |
| `quantity` | integer | 是 | 当前结存数量 | `0` | keep |
| `unit` | text | 是 | 计量单位 | `'pcs'` | keep |
| `sourceNo` | text | 否 | 最近一次影响变化的单据号；数据库物理列为 `source_no` | `''` | keep |
| `lastTransactionAt` | text | 否 | 最近变化时间；数据库物理列为 `last_transaction_at` | 无 | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 6.13 inventory_transactions
* **业务定位**: 库存变动流水明细事实表。核心库存审计台账。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 流水ID | 无 | keep |
| `transactionNo` | text | 变动流水号；数据库物理列为 `transaction_no` | 无 | keep |
| `itemId` | text | 是 | 原材料 / 产成品ID；数据库物理列为 `item_id` | 无 | keep |
| `itemCode` | text | 否 | 物品编码快照；数据库物理列为 `item_code` | `''` | keep |
| `itemName` | text | 否 | 物品名称快照；数据库物理列为 `item_name` | `''` | keep |
| `itemType` | text | 是 | 物品类型；数据库物理列为 `item_type` | `'material'` | keep |
| `projectId` | text | 否 | 关联项目ID；数据库物理列为 `project_id` | 无 | keep |
| `projectCode` | text | 否 | 项目编码快照；数据库物理列为 `project_code` | `''` | keep |
| `customerId` | text | 否 | 关联客户ID；数据库物理列为 `customer_id` | 无 | keep |
| `customerName` | text | 否 | 客户名称快照；数据库物理列为 `customer_name` | `''` | keep |
| `warehouseId` | text | 是 | 关联仓库ID；数据库物理列为 `warehouse_id` | 无 | keep |
| `warehouseName` | text | 否 | 仓库名称快照；数据库物理列为 `warehouse_name` | `''` | keep |
| `locationId` | text | 否 | 关联库位ID；数据库物理列为 `location_id` | 无 | keep |
| `locationCode` | text | 否 | 库位编码快照；数据库物理列为 `location_code` | `''` | keep |
| `transactionType` | text | 是 | 变动类型；数据库物理列为 `transaction_type` | 无 | keep |
| `quantityChange` | integer | 是 | 变动数量 (入库为正, 出库为负)；数据库物理列为 `quantity_change` | 无 | keep |
| `beforeQuantity` | integer | 是 | 变动前结存量；数据库物理列为 `before_quantity` | `0` | keep |
| `afterQuantity` | integer | 是 | 变动后结存量；数据库物理列为 `after_quantity` | `0` | keep |
| `fromStatus` | text | 否 | 变动前状态；数据库物理列为 `from_status` | 无 | keep |
| `toStatus` | text | 否 | 变动后状态；数据库物理列为 `to_status` | 无 | keep |
| `sourceType` | text | 是 | 来源单据类型；数据库物理列为 `source_type` | 无 | keep |
| `sourceId` | text | 否 | 来源单据ID；数据库物理列为 `source_id` | 无 | keep |
| `sourceNo` | text | 否 | 来源单据号快照；数据库物理列为 `source_no` | `''` | keep |
| `operatorId` | text | 否 | 操作人员ID；数据库物理列为 `operator_id` | 无 | keep |
| `operatorName` | text | 是 | 操作人员名字；数据库物理列为 `operator_name` | 无 | keep |
| `occurredAt` | text | 是 | 记账时间；数据库物理列为 `occurred_at` | 当前时间戳 | keep |
| `remark` | text | 否 | 调整/变动原因说明 | `''` | keep |
| `createdAt` | text | 是 | 写入时间 | 当前时间戳 | keep |

---

## 7. 操作表字段锁定

### 7.1 warehouses
* **业务定位**: 仓库主数据表。用于区分原材料、成品、在制品、不良品、外协等物理与逻辑库区。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 仓库ID | 无 | keep |
| `code` | text | 是 | 仓库编码 | 无 | keep |
| `name` | text | 是 | 仓库名称 | 无 | keep |
| `type` | text | 是 | 仓库类型 | `'normal'` | keep |
| `status` | text | 是 | 仓库启用状态 | `'active'` | keep |
| `factoryId` | text | 后续新增时必填 | 关联所属工厂ID；数据库物理列为 `factory_id` | 无 | need_add (v1_later) |
| `isVirtual` | integer | 后续新增时选填 | 是否为虚拟/逻辑仓 (0: 否, 1: 是)；数据库物理列为 `is_virtual` | `0` | need_add (v1_later) |
| `sortOrder` | integer | 后续新增时选填 | 排序号；数据库物理列为 `sort_order` | `0` | need_add (v1_later) |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.2 locations
* **业务定位**: 库位（货位）主数据表。归属于特定的仓库。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 库位ID | 无 | keep |
| `warehouseCode` | text | 是 | 关联仓库编码；数据库物理列为 `warehouse_code` | 无 | rename_later |
| `warehouseId` | text | 后续新增时必填 | 关联仓库ID；数据库物理列为 `warehouse_id` | 无 | need_add (v1_later) |
| `code` | text | 是 | 库位编码 | 无 | keep |
| `name` | text | 是 | 库位名称 | 无 | keep |
| `isDefault` | integer | 后续新增时选填 | 是否为仓库默认库位 (0: 否, 1: 是)；数据库物理列为 `is_default` | `0` | need_add (v1_later) |
| `sortOrder` | integer | 后续新增时选填 | 排序号；数据库物理列为 `sort_order` | `0` | need_add (v1_later) |
| `status` | text | 是 | 库位启用状态 | `'active'` | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.3 inventory_holds
* **业务定位**: 库存锁定与冻结的唯一事实表（锁定台账）。冻结与解冻业务闭环的唯一数据源头。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 冻结单ID | 无 | keep |
| `holdNo` | text | 是 | 锁定业务单号；数据库物理列为 `hold_no` | 无 | keep |
| `itemId` | text | 是 | 物品ID (产品或原材料)；数据库物理列为 `item_id` | 无 | keep |
| `itemCode` | text | 否 | 物品编码快照；数据库物理列为 `item_code` | `''` | keep |
| `itemName` | text | 否 | 物品名称快照；数据库物理列为 `item_name` | `''` | keep |
| `projectId` | text | 否 | 关联项目ID；数据库物理列为 `project_id` | 无 | keep |
| `projectCode` | text | 否 | 项目编码快照；数据库物理列为 `project_code` | `''` | keep |
| `customerId` | text | 否 | 关联客户ID；数据库物理列为 `customer_id` | 无 | keep |
| `customerName` | text | 否 | 客户名称快照；数据库物理列为 `customer_name` | `''` | keep |
| `warehouseId` | text | 是 | 仓库ID；数据库物理列为 `warehouse_id` | 无 | keep |
| `warehouseName` | text | 否 | 仓库名称快照；数据库物理列为 `warehouse_name` | `''` | keep |
| `locationId` | text | 否 | 库位ID；数据库物理列为 `location_id` | 无 | keep |
| `locationCode` | text | 否 | 库位编码快照；数据库物理列为 `location_code` | `''` | keep |
| `holdQuantity` | integer | 是 | 冻结数量；数据库物理列为 `hold_quantity` | `0` | keep |
| `processedQuantity` | integer | 是 | 已处理数量；数据库物理列为 `processed_quantity` | `0` | keep |
| `remainingQuantity` | integer | 是 | 剩余冻结数量；数据库物理列为 `remaining_quantity` | `0` | keep |
| `abnormalType` | text | 否 | 异常分类；数据库物理列为 `abnormal_type` | `''` | keep |
| `discoveryStage` | text | 否 | 发现阶段；数据库物理列为 `discovery_stage` | `''` | keep |
| `responsibleParty` | text | 否 | 责任划分方；数据库物理列为 `responsible_party` | `''` | keep |
| `handlingPlan` | text | 否 | 处理方案；数据库物理列为 `handling_plan` | `''` | keep |
| `status` | text | 是 | 状态 | `'pending'` | keep |
| `initiatorId` | text | 否 | 发起操作人ID；数据库物理列为 `initiator_id` | `''` | keep |
| `handlerId` | text | 否 | 处理人ID；数据库物理列为 `handler_id` | `''` | keep |
| `foundAt` | text | 否 | 发现时间；数据库物理列为 `found_at` | 无 | keep |
| `expectedCloseAt` | text | 否 | 预计关闭时间；数据库物理列为 `expected_close_at` | 无 | keep |
| `isDeliveryAffected` | integer | 是 | 是否影响交付 (0: 否, 1: 是)；数据库物理列为 `is_delivery_affected` | `0` | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.4 receipts
* **业务定位**: 标准入库单主表。头单据信息，其确认 `confirmed` 触发实际库存余额增加与流水记账。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 入库单ID | 无 | keep |
| `code` | text | 是 | 入库单单号 | 无 | keep |
| `sourceType` | text | 是 | 入库单业务来源；数据库物理列为 `source_type` | `'manual'` | keep |
| `status` | text | 是 | 单据状态 | `'draft'` | keep |
| `receivedDate` | text | 是 | 实际入库接收日期；数据库物理列为 `received_date` | 无 | keep |
| `sourceId` | text | 后续新增时选填 | 关联的源单主键ID；数据库物理列为 `source_id` | 无 | need_add (v1_later) |
| `sourceNo` | text | 后续新增时选填 | 关联的源单号快照；数据库物理列为 `source_no` | 无 | need_add (v1_later) |
| `confirmedAt` | text | 后续新增时选填 | 确认审核入库时间；数据库物理列为 `confirmed_at` | 无 | need_add (v1_later) |
| `confirmedBy` | text | 后续新增时选填 | 确认审核入库人；数据库物理列为 `confirmed_by` | 无 | need_add (v1_later) |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdBy` | text | 否 | 创建人；数据库物理列为 `created_by` | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.5 receipt_items
* **业务定位**: 标准入库单明细表。入库物品、数量、库位和批次的事实明细。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 明细ID | 无 | keep |
| `receiptId` | text | 是 | 关联入库单ID；数据库物理列为 `receipt_id` | 无 | keep |
| `itemId` | text | 是 | 原材料ID / 产成品ID；数据库物理列为 `item_id` | 无 | keep |
| `itemType` | text | 是 | 物品类型 (material / product)；数据库物理列为 `item_type` | 无 | need_add (lock_before_v1) |
| `itemCode` | text | 后续新增时选填 | 物品编码快照；数据库物理列为 `item_code` | `''` | need_add (v1_later) |
| `itemName` | text | 后续新增时选填 | 物品名称快照；数据库物理列为 `item_name` | `''` | need_add (v1_later) |
| `projectId` | text | 否 | 关联项目ID；数据库物理列为 `project_id` | 无 | keep |
| `batchNo` | text | 否 | 批次号 / 炉号，当前 V1 作为选填追溯字段，不作为主线必填字段；数据库物理列为 `batch_no` | 无 | keep |
| `quantity` | integer | 是 | 实际接收数量 | 无 | keep |
| `unit` | text | 后续新增时选填 | 计量单位 | `'pcs'` | need_add (v1_later) |
| `warehouseId` | text | 是 | 入库仓库ID；数据库物理列为 `warehouse_id` | 无 | keep |
| `locationId` | text | 否 | 入库库位ID；数据库物理列为 `location_id` | 无 | keep |
| `inventoryStatus` | text | 后续新增时选填 | 入库库存状态；数据库物理列为 `inventory_status` | `'available'` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.6 issues
* **业务定位**: 标准出库单主表。头单据信息，其确认 `confirmed` 触发实际库存余额扣减与流水记账。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 出库单ID | 无 | keep |
| `code` | text | 是 | 出库单单号 | 无 | keep |
| `sourceType` | text | 是 | 出库单业务来源；数据库物理列为 `source_type` | `'manual'` | keep |
| `status` | text | 是 | 单据状态 | `'draft'` | keep |
| `issuedDate` | text | 是 | 实际发料出库时间；数据库物理列为 `issued_date` | 无 | keep |
| `sourceId` | text | 后续新增时选填 | 关联的源单主键ID；数据库物理列为 `source_id` | 无 | need_add (v1_later) |
| `sourceNo` | text | 后续新增时选填 | 关联的源单号快照；数据库物理列为 `source_no` | 无 | need_add (v1_later) |
| `confirmedAt` | text | 后续新增时选填 | 确认审核出库时间；数据库物理列为 `confirmed_at` | 无 | need_add (v1_later) |
| `confirmedBy` | text | 后续新增时选填 | 确认审核出库人；数据库物理列为 `confirmed_by` | 无 | need_add (v1_later) |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdBy` | text | 否 | 创建人；数据库物理列为 `created_by` | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.7 issue_items
* **业务定位**: 标准出库单明细表。出库物品、数量、库位和批次的事实明细。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 明细ID | 无 | keep |
| `issueId` | text | 是 | 关联出库单ID；数据库物理列为 `issue_id` | 无 | keep |
| `itemId` | text | 是 | 原材料ID / 产成品ID；数据库物理列为 `item_id` | 无 | keep |
| `itemType` | text | 是 | 物品类型 (material / product)；数据库物理列为 `item_type` | 无 | need_add (lock_before_v1) |
| `itemCode` | text | 后续新增时选填 | 物品编码快照；数据库物理列为 `item_code` | `''` | need_add (v1_later) |
| `itemName` | text | 后续新增时选填 | 物品名称快照；数据库物理列为 `item_name` | `''` | need_add (v1_later) |
| `projectId` | text | 否 | 关联项目ID；数据库物理列为 `project_id` | 无 | keep |
| `batchNo` | text | 否 | 批次号 / 炉号，当前 V1 作为选填追溯字段，不作为主线必填字段；数据库物理列为 `batch_no` | 无 | keep |
| `quantity` | integer | 是 | 实际出库数量 | 无 | keep |
| `unit` | text | 后续新增时选填 | 计量单位 | `'pcs'` | need_add (v1_later) |
| `warehouseId` | text | 是 | 出库仓库ID；数据库物理列为 `warehouse_id` | 无 | keep |
| `locationId` | text | 否 | 出库库位ID；数据库物理列为 `location_id` | 无 | keep |
| `inventoryStatus` | text | 后续新增时选填 | 指定从哪类库存状态出库；数据库物理列为 `inventory_status` | `'available'` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.8 quality_issues
* **业务定位**: 品质异常处理主单表。来料异常、过程不良、客退异常等。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 异常单主键ID | 无 | keep |
| `code` | text | 是 | 异常单单号 | 无 | keep |
| `sourceType` | text | 是 | 单据来源；数据库物理列为 `source_type` | `'manual'` | keep |
| `sourceId` | text | 否 | 来源表记录ID；数据库物理列为 `source_id` | 无 | keep |
| `orderId` | text | 否 | 旧订单ID（已废弃）；数据库物理列为 `order_id` | 无 | deprecated |
| `orderItemId` | text | 否 | 旧订单明细ID（已废弃）；数据库物理列为 `order_item_id` | 无 | deprecated |
| `workOrderId` | text | 否 | 派工发单工单ID；数据库物理列为 `work_order_id` | 无 | keep |
| `materialId` | text | 否 | 关联原材料物料ID；数据库物理列为 `material_id` | 无 | keep |
| `productId` | text | 否 | 关联产品ID；数据库物理列为 `product_id` | 无 | keep |
| `severity` | text | 是 | 严重程度 | `'medium'` | keep |
| `status` | text | 是 | 单据处理状态 | `'open'` | keep |
| `title` | text | 是 | 标题 | 无 | keep |
| `description` | text | 否 | 异常描述说明 | `''` | keep |
| `quantity` | integer | 是 | 异常涉及数量 | `0` | keep |
| `freezeId` | text | 否 | 旧冻结外键（已废弃）；数据库物理列为 `freeze_id` | 无 | deprecated |
| `inventoryLockId` | text | 否 | 关联锁定冻结ID；数据库物理列为 `inventory_lock_id` | 无 | keep |
| `handlingMethod` | text | 否 | 最终判定处理方式；数据库物理列为 `handling_method` | `''` | keep |
| `warehouseCode` | text | 否 | 仓库编码快照；数据库物理列为 `warehouse_code` | 无 | rename_later |
| `warehouseId` | text | 后续新增时选填 | 仓库ID；数据库物理列为 `warehouse_id` | 无 | need_add (v1_later) |
| `locationCode` | text | 否 | 库位编码快照；数据库物理列为 `location_code` | 无 | rename_later |
| `locationId` | text | 后续新增时选填 | 库位ID；数据库物理列为 `location_id` | 无 | need_add (v1_later) |
| `batchNo` | text | 否 | 批次号 / 炉号，当前 V1 作为选填追溯字段，不作为主线必填字段；数据库物理列为 `batch_no` | 无 | keep |
| `owner` | text | 否 | 负责人姓名 | `''` | keep |
| `closedAt` | text | 否 | 关闭时间；数据库物理列为 `closed_at` | 无 | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.9 issue_actions
* **业务定位**: 质量处理跟进表。每次确认、冻结、解冻、报废、关闭的动作轨迹留痕。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 动作日志主键ID | 无 | keep |
| `issueId` | text | 是 | 关联品质异常单ID；数据库物理列为 `issue_id` | 无 | keep |
| `action` | text | 是 | 执行动作类型 | 无 | keep |
| `message` | text | 否 | 动作说明描述 | `''` | keep |
| `actor` | text | 是 | 操作员姓名 | 无 | keep |
| `actionType` | text | 后续新增时选填 | 操作归类 (如 freeze / scrap)；数据库物理列为 `action_type` | `''` | need_add (v1_later) |
| `quantity` | integer | 后续新增时选填 | 动作涉及数量 | `0` | need_add (v1_later) |
| `relatedTransactionId` | text | 后续新增时选填 | 关联的库存变动流水ID；数据库物理列为 `related_transaction_id` | 无 | need_add (v1_later) |
| `relatedHoldId` | text | 后续新增时选填 | 关联的锁定冻结ID；数据库物理列为 `related_hold_id` | 无 | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |

### 7.10 shipments
* **业务定位**: 销售发货单主表。记录发货头信息，审核确认后回写 `demand_lines` 发货数量。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 发货单单头ID | 无 | keep |
| `code` | text | 是 | 发货单编码 | 无 | keep |
| `deliveryPlanId` | text | 否 | 送货计划ID；数据库物理列为 `delivery_plan_id` | 无 | keep |
| `orderId` | text | 否 | 旧订单ID（已废弃）；数据库物理列为 `order_id` | 无 | deprecated |
| `orderLineId` | text | 否 | 旧订单行ID（已废弃）；数据库物理列为 `order_line_id` | 无 | deprecated |
| `orderItemId` | text | 否 | 旧条目外键（已废弃）；数据库物理列为 `order_item_id` | 无 | deprecated |
| `demandId` | text | 否 | 需求计划主单ID；数据库物理列为 `demand_id` | 无 | keep |
| `demandLineId` | text | 否 | 需求计划行明细ID；数据库物理列为 `demand_line_id` | 无 | keep |
| `productId` | text | 否 | 发货产品ID (旧冗余字段)；数据库物理列为 `product_id` | 无 | need_review |
| `warehouseCode` | text | 否 | 出库仓库编码；数据库物理列为 `warehouse_code` | 无 | rename_later |
| `locationCode` | text | 否 | 出库库位编码；数据库物理列为 `location_code` | 无 | rename_later |
| `batchNo` | text | 否 | 出库批次号；数据库物理列为 `batch_no` | `''` | keep |
| `quantity` | integer | 否 | 销售发货总数 (旧冗余字段) | `0` | need_review |
| `status` | text | 是 | 单据流转状态 | `'created'` | keep |
| `shippedAt` | text | 否 | 实际发货时间；数据库物理列为 `shipped_at` | 无 | keep |
| `confirmedBy` | text | 否 | 发货确认员姓名；数据库物理列为 `confirmed_by` | `''` | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.11 shipment_items
* **业务定位**: 实际发货单明细子表。销售交付出库的唯一多品发货计算事实源。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 明细ID | 无 | keep |
| `shipmentId` | text | 是 | 发货单ID；数据库物理列为 `shipment_id` | 无 | keep |
| `orderItemId` | text | 否 | 旧条目外键（已废弃）；数据库物理列为 `order_item_id` | 无 | deprecated |
| `productId` | text | 是 | 关联发货产品ID；数据库物理列为 `product_id` | 无 | keep |
| `quantity` | integer | 是 | 发货出库数量 | 无 | keep |
| `batchNo` | text | 否 | 发货批次号，当前 V1 作为选填追溯字段，不作为主线必填字段；数据库物理列为 `batch_no` | 无 | keep |
| `demandLineId` | text | 是 | 关联需求计划行ID；数据库物理列为 `demand_line_id` | 无 | need_add (lock_before_v1) |
| `warehouseId` | text | 后续新增时选填 | 扣减库存仓库ID；数据库物理列为 `warehouse_id` | 无 | need_add (v1_later) |
| `locationId` | text | 后续新增时选填 | 扣减库存库位ID；数据库物理列为 `location_id` | 无 | need_add (v1_later) |
| `unit` | text | 后续新增时选填 | 单位 | `'pcs'` | need_add (v1_later) |
| `productCode` | text | 后续新增时选填 | 发货产品编码快照；数据库物理列为 `product_code` | `''` | need_add (v1_later) |
| `productName` | text | 后续新增时选填 | 发货产品名称快照；数据库物理列为 `product_name` | `''` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |

### 7.12 work_order_steps
* **业务定位**: 工单下的工序步骤表。指导现场扫码报工、不良拦截的唯一工序事实源。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 步骤ID | 无 | keep |
| `workOrderId` | text | 是 | 关联工单ID；数据库物理列为 `work_order_id` | 无 | keep |
| `processId` | text | 是 | 关联工序ID；数据库物理列为 `process_id` | 无 | keep |
| `stepOrder` | integer | 是 | 工序执行顺序；数据库物理列为 `step_order` | 无 | keep |
| `name` | text | 是 | 工序名称 | 无 | keep |
| `plannedQuantity` | integer | 是 | 工序排程计划数；数据库物理列为 `planned_quantity` | 无 | keep |
| `completedQuantity` | integer | 是 | 工序合格数 (完工数)；数据库物理列为 `completed_quantity` | `0` | keep |
| `defectQuantity` | integer | 是 | 工序不良数；数据库物理列为 `defect_quantity` | `0` | keep |
| `scrapQuantity` | integer | 是 | 工序报废数；数据库物理列为 `scrap_quantity` | `0` | keep |
| `status` | text | 是 | 工序执行状态 | `'pending'` | keep |
| `machineId` | text | 否 | 分配的物理机器ID；数据库物理列为 `machine_id` | 无 | keep |
| `reportedQuantity` | integer | 后续新增时选填 | 该工序累积报工总数；数据库物理列为 `reported_quantity` | `0` | need_review |
| `processCode` | text | 后续新增时选填 | 工序编码快照；数据库物理列为 `process_code` | `''` | need_add (v1_later) |
| `machineCode` | text | 后续新增时选填 | 机器编码快照；数据库物理列为 `machine_code` | `''` | need_add (v1_later) |
| `operator` | text | 后续新增时选填 | 当前首选操作工姓名 | `''` | need_add (v1_later) |
| `qualityRequired` | integer | 后续新增时选填 | 本工序是否强检 (0: 否, 1: 是)；数据库物理列为 `quality_required` | `0` | need_add (v1_later) |
| `startedAt` | text | 否 | 实际开工日期时间；数据库物理列为 `started_at` | 无 | keep |
| `completedAt` | text | 否 | 实际完工日期时间；数据库物理列为 `completed_at` | 无 | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

### 7.13 operation_reports
* **业务定位**: 工序报工记录事实表（报工日志）。车间扫码或手工汇报明细。
* **V1 字段锁定表**:
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 报工日志ID | 无 | keep |
| `reportNo` | text | 是 | 报工单号；数据库物理列为 `report_no` | 无 | keep |
| `cardId` | text | 否 | 流程卡主键；数据库物理列为 `card_id` | 无 | keep |
| `cardCode` | text | 否 | 流程卡条码快照；数据库物理列为 `card_code` | `''` | keep |
| `productionOrderId` | text | 是 | 关联派工单 (实际应映射为 `workOrderId`)；数据库物理列为 `production_order_id` | 无 | rename_later |
| `workOrderId` | text | 后续新增时必填 | 关联派工工单ID；数据库物理列为 `work_order_id` | 无 | need_add (v1_later) |
| `operationId` | text | 是 | 关联工序步骤ID；数据库物理列为 `operation_id` | 无 | keep |
| `operationName` | text | 是 | 工序名称快照；数据库物理列为 `operation_name` | 无 | keep |
| `reportType` | text | 是 | 报工类型；数据库物理列为 `report_type` | 无 | keep |
| `goodQty` | integer | 是 | 本次报工合格数；数据库物理列为 `good_qty` | `0` | keep |
| `defectQty` | integer | 是 | 本次报工不良数；数据库物理列为 `defect_qty` | `0` | keep |
| `scrapQty` | integer | 是 | 本次报废数量；数据库物理列为 `scrap_qty` | `0` | keep |
| `reworkQty` | integer | 是 | 本次翻工/返修数；数据库物理列为 `rework_qty` | `0` | keep |
| `operator` | text | 是 | 报工操作员 | 无 | keep |
| `inspector` | text | 否 | 质检判定员；数据库物理列为 `inspector` | `''` | keep |
| `equipment` | text | 否 | 加工设备快照名称 | `''` | rename_later |
| `machineId` | text | 后续新增时选填 | 加工机器设备ID；数据库物理列为 `machine_id` | 无 | need_add (v1_later) |
| `defectReason` | text | 否 | 不良品产生原因；数据库物理列为 `defect_reason` | `''` | keep |
| `manualReason` | text | 否 | 手工填报原因；数据库物理列为 `manual_reason` | `''` | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdBy` | text | 否 | 填报人；数据库物理列为 `created_by` | `''` | keep |
| `createdAt` | text | 是 | 填报时间；数据库物理列为 `created_at` | 当前时间戳 | keep |

---

## 8. lock_before_v1 字段清单

以下 3 个字段为 Dday V1 最终锁库前**必须物理补充**的字段：

| 表 | 字段 | 数据库物理列 | 原因 |
|---|---|---|---|
| `receipt_items` | `itemType` | `item_type` | 区分入库明细是 material 还是 product |
| `issue_items` | `itemType` | `item_type` | 区分出库明细是 material 还是 product |
| `shipment_items` | `demandLineId` | `demand_line_id` | 发货必须精确回写需求行 |

---

## 9. v1_later 字段清单

以下字段为 Dday V1 核心/操作表后续待补充清单（**本阶段不修改 schema**，仅作为后续数据库变更的候选储备）：

| 表 | 字段 | 数据库物理列 | 原因 |
|---|---|---|---|
| `customers` | `customerCode` | `customer_code` | 客户需要有简短易读的唯一编码用于前台搜索和导入匹配 |
| `profile_suppliers` | `supplierCode` | `supplier_code` | 原材料采购和入库需要通过易读的供应商编码识别，而非仅靠长 UUID |
| `products` | `factoryId` | `factory_id` | 取代硬编码的工厂文本，使产品能指派给不同的实体工厂 |
| `products` | `drawingNo` | `drawing_no` | CNC加工件交付给客户前，必须核对具体的图纸版本号 |
| `materials` | `supplierId` | `supplier_id` | 原材料默认供应商，以便做采购建议和到货跟踪 |
| `materials` | `materialCategory` | `material_category` | 物料大类分群分类（如6系铝材、辅料、耗材） |
| `materials` | `defaultLeadTime` | `default_lead_time` | 原材料默认采购提前期，供MRP齐套性算期使用 |
| `product_materials` | `usageUnit` | `usage_unit` | 损耗计量计算单位 |
| `product_materials` | `lossRate` | `loss_rate` | 备料计算时必须包含型材锯切及打样的定额损耗 |
| `product_materials` | `isPrimary` | `is_primary` | 用于标识多物料BOM中，哪一个是核心主型材 |
| `product_materials` | `remark` | `remark` | BOM条目消耗备注 |
| `demand_lines` | `projectId` | `project_id` | 销售明细行必须强外键关联到项目，而非冗余 projectCode 文本 |
| `demand_lines` | `requiredQuantity` | `required_quantity` | 实际计算需求量 (可加备品系数) |
| `demand_lines` | `plannedQuantity` | `planned_quantity` | 已排产生产计划的累计总数，用以监控订单排产进度 |
| `demand_lines` | `producedQuantity` | `produced_quantity` | 过程报工合格产出数累计，用以监控车间完工情况 |
| `demand_lines` | `cancelledQuantity` | `cancelled_quantity` | 累计行取消数量 |
| `demand_lines` | `priority` | `priority` | 需求明细行明细优先级 |
| `demand_lines` | `sourceLineNo` | `source_line_no` | 导入的原始文件行号 |
| `demand_lines` | `closedAt` | `closed_at` | 明细行级结算或关闭时间戳 |
| `production_plans` | `factoryId` | `factory_id` | 计划指派的具体加工工厂 |
| `production_plans` | `planType` | `plan_type` | 计划排产的类型划分（正常、翻工、备库） |
| `production_plans` | `lockedAt` | `locked_at` | 计划冻结修改的锁定时间戳 |
| `production_plans` | `cancelledAt` | `cancelled_at` | 计划取消日期时间戳 |
| `work_orders` | `factoryId` | `factory_id` | 车间派工的具体执行厂区 |
| `work_orders` | `processRouteSnapshot` | `process_route_snapshot` | 锁死开工时的工艺路线快照，防止全局产品工艺修改波及执行中工单 |
| `work_orders` | `releasedAt` | `released_at` | 工单正式下发下达给车间的时间戳 |
| `work_orders` | `startedAt` | `started_at` | 车间开工时间戳 |
| `work_orders` | `cancelledAt` | `cancelled_at` | 工单强制取消时间戳 |
| `warehouses` | `factoryId` | `factory_id` | 仓库必须明确归属于哪个工厂，以便按工厂组织数据隔离 |
| `warehouses` | `isVirtual` | `is_virtual` | 标识是否为虚拟/逻辑仓库（如虚拟在途仓、外协虚拟仓） |
| `warehouses` | `sortOrder` | `sort_order` | 排序号，控制前台仓库列表展示顺序 |
| `locations` | `warehouseId` | `warehouse_id` | 库位强外键关联到仓库表，逐步替代原 `warehouseCode` |
| `locations` | `isDefault` | `is_default` | 标识是否为仓库的默认库位，用于入库时默认推荐 |
| `locations` | `sortOrder` | `sort_order` | 排序号，控制前台库位列表展示顺序 |
| `receipts` | `sourceId` | `source_id` | 记录生成入库单的源业务记录主键（如采购收料单ID、工单ID） |
| `receipts` | `sourceNo` | `source_no` | 记录源业务单号快照，方便对账 |
| `receipts` | `confirmedAt` | `confirmed_at` | 确认审核入库的系统时间 |
| `receipts` | `confirmedBy` | `confirmed_by` | 确认审核入库的操作员 |
| `receipt_items` | `itemCode` | `item_code` | 物品编码快照，作为历史追溯和对账的冗余备份 |
| `receipt_items` | `itemName` | `item_name` | 物品名称快照，便于列表直观展示 |
| `receipt_items` | `unit` | `unit` | 计量单位，用以检验入库单位是否与库存主数据单位一致 |
| `receipt_items` | `inventoryStatus` | `inventory_status` | 入库库存状态（如默认 available，或直接入待检区/冻结状态） |
| `issues` | `sourceId` | `source_id` | 记录生成出库单的源业务记录主键（如生产领料计划ID、发货计划ID） |
| `issues` | `sourceNo` | `source_no` | 记录源业务单单号快照 |
| `issues` | `confirmedAt` | `confirmed_at` | 确认审核出库的系统时间 |
| `issues` | `confirmedBy` | `confirmed_by` | 确认审核出库的操作员 |
| `issue_items` | `itemCode` | `item_code` | 物品编码快照，冗余追溯使用 |
| `issue_items` | `itemName` | `item_name` | 物品名称快照 |
| `issue_items` | `unit` | `unit` | 计量单位，用于校验 |
| `issue_items` | `inventoryStatus` | `inventory_status` | 指定从哪种库存状态（如 available/held/scrapped）扣减库存 |
| `quality_issues` | `warehouseId` | `warehouse_id` | 品质异常库存当前所处的仓库ID外键 |
| `quality_issues` | `locationId` | `location_id` | 品质异常库存当前所处的库位ID外键 |
| `issue_actions` | `actionType` | `action_type` | 操作动作大类归化（如 freeze/unfreeze/scrap/close），方便报表统计 |
| `issue_actions` | `quantity` | `quantity` | 该处理动作涉及的具体数量 |
| `issue_actions` | `relatedTransactionId` | `related_transaction_id` | 关联解冻或报废时在库存台账里落账的流水ID，实现闭环追溯 |
| `issue_actions` | `relatedHoldId` | `related_hold_id` | 关联对应的锁定冻结记录ID |
| `shipment_items` | `warehouseId` | `warehouse_id` | 明细行发货扣减的具体仓库ID，支持单头多库位发货 |
| `shipment_items` | `locationId` | `location_id` | 明细行发货扣减的具体库位ID |
| `shipment_items` | `unit` | `unit` | 发货数量的计量单位 |
| `shipment_items` | `productCode` | `product_code` | 产品编码快照 |
| `shipment_items` | `productName` | `product_name` | 产品名称快照 |
| `work_order_steps` | `processCode` | `process_code` | 工序编码快照，确保业务路线快照性 |
| `work_order_steps` | `machineCode` | `machine_code` | 锁定设备编码快照 |
| `work_order_steps` | `operator` | `operator` | 首选操作员快照/派发人 |
| `work_order_steps` | `qualityRequired` | `quality_required` | 该工序是否需要首检/巡检强品质控制 |
| `operation_reports` | `workOrderId` | `work_order_id` | 关联工单ID，重命名修正 |
| `operation_reports` | `machineId` | `machine_id` | 用于关联实际执行加工的设备主数据ID |

---

## 10. 状态枚举锁定

### 10.1 需求及计划枚举
*   **`customer_demands.status`**:
    *   `imported`: 需求已导入（默认）
    *   `confirmed`: 需求已确认
    *   `planned`: 生产计划已编排
    *   `in_production`: 生产执行中
    *   `ready_to_ship`: 已齐套待发货
    *   `partially_shipped`: 部分已发货
    *   `shipped`: 已全部发货
    *   `closed`: 正常关闭结单
    *   `cancelled`: 计划取消
*   **`demand_lines.status`**:
    *   `imported`: 需求明细已导入（默认）
    *   `confirmed`: 明细已确认
    *   `planned`: 明细已排产
    *   `in_production`: 明细生产执行中
    *   `ready_to_ship`: 明细待发货
    *   `partially_shipped`: 明细部分发货
    *   `shipped`: 明细已全部发货
    *   `closed`: 明细关闭
    *   `cancelled`: 明细取消
    *   *说明*: 导入后主表与明细行必须均处于 `imported` 状态，严禁主表为 `imported` 但明细行直接置为 `confirmed`。
*   **`production_plans.status`**:
    *   `draft`: 草稿
    *   `released`: 计划已下发
    *   `pending`: 挂起/待料
    *   `running`: 生产执行中
    *   `completed`: 计划完工
    *   `paused`: 计划暂停
    *   `cancelled`: 计划取消
    *   `abnormal_closed`: 异常关闭

### 10.2 执行、报工及品质枚举
*   **`work_orders.status`**:
    *   `created`: 工单已创建
    *   `released`: 工单已发布
    *   `running`: 执行中
    *   `paused`: 暂停中
    *   `completed`: 已完工
    *   `closed`: 正常关闭
    *   `cancelled`: 已取消
*   **`work_order_steps.status`**:
    *   `pending`: 待派工/排队
    *   `running`: 加工中
    *   `completed`: 工序完工
    *   `skipped`: 工序跳过
    *   `cancelled`: 工序取消
*   **`operation_reports.reportType`**:
    *   `scan`: PDA 扫码报工
    *   `manual`: PC 补单手动报工
    *   `rework`: 翻工/返修报工
    *   `scrap`: 过程报废填报
    *   `adjustment`: 报工偏差调整
*   **`quality_issues.status`**:
    *   `open`: 异常登记（默认）
    *   `confirmed`: 异常已确认
    *   `frozen`: 已冻结挂载品质锁 (此时必须强绑定有效的 `inventoryLockId` 锁定记录)
    *   `processing`: 品质判定处理中
    *   `resolved`: 异常已判定释放
    *   `closed`: 异常关闭 (若冻结单上存在 `remainingQuantity > 0` 的剩余冻结数量，不得关闭此单)
    *   `cancelled`: 单据取消

### 10.3 仓储发货枚举
*   **`inventory_balances.inventoryStatus`**:
    *   `available`: 可用库存
    *   `held`: 冻结库存 (统称 held，原 `'frozen'` 彻底停用)
    *   `scrapped`: 报废库存 (统称 scrapped，原 `'scrap'` 彻底停用)
    *   `inspection`: 待检库存 (v1_later)
    *   `in_transit`: 在途库存 (v1_later)
*   **`inventory_transactions.transactionType`**:
    *   `receipt`: 采购/到货收料入库
    *   `issue`: 车间领料/部门出库
    *   `production_receipt`: 车间完工合格入库
    *   `production_issue`: 生产执行扣料/投料
    *   `inventory_freeze`: 品质冻结锁定
    *   `inventory_unfreeze`: 释放解冻可用
    *   `scrap`: 不良品报废出库
    *   `adjustment`: 库存数量偏差调整
    *   `stocktake_adjustment`: 盘点差异损益调整
    *   `shipment`: 销售出库发货
*   **`inventory_holds.status`**:
    *   `pending`: 冻结待审批
    *   `held`: 锁定生效
    *   `partially_processed`: 部分处理
    *   `released`: 完全释放
    *   `scrapped`: 判定报废
    *   `closed`: 关闭锁定
    *   `cancelled`: 锁定取消
*   **`receipts.status`**:
    *   `draft`: 草稿
    *   `confirmed`: 确认审核落账
    *   `cancelled`: 单据作废
*   **`issues.status`**:
    *   `draft`: 草稿
    *   `confirmed`: 确认审核落账
    *   `cancelled`: 单据作废
*   **`shipments.status`**:
    *   `created`: 发货单已创建
    *   `confirmed`: 发货审核确认
    *   `cancelled`: 发货单作废

---

## 11. 关键业务规则锁定

### 11.1 需求与排产
- `demand_lines` 是生产、排产、发货追踪的源头。
- `production_demand_links` 是生产计划与需求行的唯一可信关联。
- 即使一个需求行生成一个生产计划，也必须写入 `production_demand_links`。
- `production_plans.orderLineId` 不作为新排产逻辑的来源。
- `work_orders.orderLineId` 不作为新工单逻辑的来源。

### 11.2 产品与型材
- `products` 表示 CNC 加工后交付给客户的产品。
- `materials` 表示型材 / 原材料 / 辅料。
- 型材在主数据中统一作为 `materials` 维护，其 `type` 统一使用 `'profile'`。
- `product_materials` BOM 关联表是产品与物料消耗关系的唯一事实源。
- 不新增 `products.defaultMaterialId` 字段。
- `products.profile_code` 后续废弃，不作为唯一的型材来源。

### 11.3 库存
- `inventory_transactions` 是库存变动的唯一流水事实表，`inventory_balances` 是库存当前结余结果表。
- 业务模块绝对禁止直接 update `inventory_balances`。
- 所有的库存数量或状态变化，必须由且仅由 `InventoryLedgerService` 统一记账，同时影响余额、生成流水。
- 库存冻结、解冻、报废动作，必须同时保障余额 Delta 刷新、生成相匹配的流水并更新 `inventory_holds` 台账。

### 11.4 入库
- `receipts` 和 `receipt_items` 表达标准入库事务。
- 入库单为 `draft` 状态时对实物库存不作任何变动。
- 当入库单更新为 `confirmed` 时，才允许扣减在制品/增加成品与原材料，并生成 `inventory_transactions` 流水与 `inventory_balances` 余额。
- 末工序报工完工合格后，应优先自动生成入库建议单，状态为 `draft`，待仓库审核确认后落账入库。

### 11.5 出库
- `issues` 和 `issue_items` 表达标准出库事务。
- 出库单为 `draft` 状态时不改动库存。
- 出库单置为 `confirmed` 后，库存服务才执行校验并扣减实物库存，生成出库流水。
- 原材料及型材的消耗扣减应发生在领料或投料确认环节。若 V1 暂无独立领料流程，可在工单首工序合格报工时按 BOM 比例扣减。但必须设置防重扣机制，不允许每次报工都重复扣减。

### 11.6 质量异常
- `quality_issues` 是品质异常唯一主表，`issue_actions` 用于跟进品质处理日志。
- 全局废弃旧 `freezeId` 字段，品质异常若判定执行库存冻结，必须通过外键 `inventoryLockId` 强绑定 `inventory_holds` 记录。
- 品质异常单状态为 `frozen` 时，必须保证在 `inventory_holds` 中存在生效的锁定记录，且 `inventoryLockId` 不能为空。
- 若 `inventory_holds.remainingQuantity > 0`，则对应的质量异常单在业务规则上不得执行关闭 `closed`。关闭前必须先解冻或报废。

### 11.7 发货
- `shipments` 和 `shipment_items` 是销售发货交付的事实唯一数据源。
- 短期单品发货可以兼容头表 `shipments.demandLineId`。
- 一旦启用 `shipment_items` 明细发货，必须以 `shipment_items.demandLineId` 作为发货回写需求行的唯一可信来源，单头字段作 deprecated 废弃。
- 发货单审核确认 `confirmed` 后，必须实时扣减成品库存并写入流水，且反向回写需求行 `demand_lines.shippedQuantity`（已发货数量）并扣减未发货数量，自动触发需求行状态变更为 `partially_shipped` 或 `shipped`。

### 11.8 报工
- `work_order_steps` 维护工序执行步骤事实，`operation_reports` 记录报工日志事实。
- `operation_reports.operationId` 必须强指向 `work_order_steps.id`。
- `operation_reports.productionOrderId` 实际表达工单 ID，在 V1_later 应重构改名为 `workOrderId`。
- `work_order_steps.completedQuantity` 严格定义为“本工序累计合格产出数量”。不应重复在步骤上新增 `good_quantity` 字段。
- 多次报工 `operation_reports.goodQty` 应当累加到对应的工序步骤 `work_order_steps.completedQuantity` 中。

---

## 12. Codex 数据库修改禁令

从 Dday V1 版本正式实施起，任何智能代理、Codex 模型或自动协作机制均必须遵守以下数据库修改禁令：

### 12.1 严禁修改
- 严禁自行改动 `src/db/schema.ts` 结构。
- 严禁修改 `migrations/*` 中的历史迁移 SQL。
- 严禁随意新建或物理删除数据库表。
- 严禁自行增加、删除或修改任意现有数据库表中的物理列与字段类型。
- 严禁自行添加新数据库 migration。
- 严禁对 Drizzle ORM 配置及 `wrangler.jsonc` 绑定资源执行修改。
- 严禁将 deprecated 旧表作为事实源或将新业务向旧表写入数据。

### 12.2 允许修改
在符合 `docs/DATABASE_LOCK_V1.md` 逻辑规范的前提下，Codex 可以且仅可修改：
- 路由接口层代码 (`src/routes/*`)。
- 业务逻辑服务层代码 (`src/services/*`)。
- 前端管理后台页面与组件 (`src/admin/*`)。
- 查询语句逻辑的重构、字段映射匹配。
- 状态转换与校验规则。

### 12.3 数据库变更申请流程
若业务功能发生重大升级，确实需要新增或改动数据库：
1. **不得直接操作**: 严禁直接改写 schema 或生成 migration。
2. **提交申请表**: 必须先提交如下的标准《数据库变更申请》供人工评估确认：

| 项目 | 内容 |
|---|---|
| 变更原因 | |
| 影响业务 | |
| 涉及表 | |
| 涉及字段 | |
| 是否可用现有字段替代 | |
| 不修改会造成什么问题 | |
| 推荐方案 | |
| 是否需要 migration | |
| 是否影响已有数据 | |
| 回滚方案 | |

---

## 13. 待人工确认问题

为指导 Dday V1 后续的开发与架构清洗，以下 15 个关于历史遗留或业务未决的关键问题必须提交人工确认：

1. **`projects.party_id` 的改名与迁移问题**: 目前 `projects.party_id` 仍关联旧的 `parties` 表。是否在 V1 锁库后，物理将其更名并强制迁移为 `customer_id` 且设置外键关联至新 `customers` 表？
2. **`products.factory` 的重构与外键迁移问题**: 目前 `products.factory` 存为文本 `'宜宾'`。是否在 V1 锁库后，物理将其更名为 `factoryId` 并外键关联至 `manufacturing_factories`？
3. **`demand_lines.project_id` 缺失问题**: 当前 `demand_lines` 没有物理项目外键。是否将其作为 `lock_before_v1` 的极高优先级必填外键字段强行补齐？
4. **`demand_lines.status` 默认值修正问题**: 目前 schema 默认值为 confirmed。是否需要人工校准，将默认值调整为 `imported`，以确保导入批次时主明细状态的一致性？
5. **`receipt_items.itemType` 的物理锁库新增问题**: 明细中缺少区分物料还是产品的标志。是否需要物理执行锁库前新增，以避免服务层对 itemId 联表时产生歧义？
6. **`issue_items.itemType` 的物理锁库新增问题**: 出库明细中缺少区分物料还是产品的标志。是否需要物理执行锁库前新增，防止联表歧义？
7. **`shipment_items.demandLineId` 的物理锁库新增问题**: 发货明细缺少对销售需求明细的行级外键关联。是否必须执行锁库前物理新增，以实现行级发货数量回写精确追溯？
8. **`quality_issues.freezeId` 的彻底废弃判定**: 当前质量单同时存在 `freezeId` 和 `inventoryLockId` 两个字段。是否通过人工代码清理，完全弃用并删除 `freezeId` 的逻辑依赖？
9. **`production_reports` 旧表的彻底迁移与删除时机**: 旧报工表已废弃。新功能已完全迁移至 `operation_reports`，何时可以通过 migration 物理删除此旧表？
10. **`route_operations` 旧表的彻底迁移与删除时机**: 工序执行步骤已迁移至 `work_order_steps`，何时可以通过 migration 物理删除此旧表？
11. **`warehouseCode` 文本关联在 V1 阶段的保留意图**: `locations` 等表通过文本编码关联仓库。是否确定在 V1 阶段只作读兼容保留，等 V1_later 再通过新增 `warehouseId` 物理外键彻底替代？
12. **`locationCode` 文本关联在 V1 阶段的保留意图**: 库存余额/流水等表通过文本编码关联库位。是否确定 V1 阶段保持现状，V1_later 再通过新增 `locationId` 物理外键彻底清洗替代？
13. **末工序合格报工触发成品建议入库的流程防线**: 报工合格后，是否确定只生成 `draft` 状态的成品入库建议单，必须由仓库人员在系统确认入库后才发生库存增加？
14. **型材库存扣减的业务触发时机**: 是否明确型材消耗仅在生产领料/投料确认时扣减，在 V1 暂无领料模块时首工序合格报工按 BOM 自动扣减并设置严格的防重扣机制？
15. **Dday V1 不进行强制批次追踪的业务共识**: 是否达成共识，V1 阶段将 `batchNo` 仅作为追溯的选填快照字段，不强制作为 MRP 备料与库存扣减的计算维度？
