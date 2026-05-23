# Dday V1 操作表字段草案

## 字段状态定义

| 状态 | 含义 |
|---|---|
| keep | 字段保留，当前字段名和语义基本可接受 |
| rename_later | 字段语义可用，但字段名不准确，后续需要改名 |
| deprecated | 字段后续废弃，新逻辑不应继续依赖 |
| need_add | V1 应该补充该字段，但本次不新增 |
| need_review | 字段含义不清，需要人工确认 |

---

## 核心操作表设计及审计

### 一、warehouses

#### 1. 业务定位
`warehouses` 是仓库主数据表。V1 中仓库用于区分原材料库、成品库、在制品库、不良品库、外协库等物理或逻辑库存区域。仓库主数据本身不直接触发库存数量的变化（即不直接更改库存量），但作为库存账目的基础属性，所有的库存余额（`inventory_balances`）、库存流水变动（`inventory_transactions`）、入库、出库、冻结均必须关联到特定的仓库。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 仓库唯一ID | keep | 主键。 |
| `code` | text | 仓库唯一编码 | keep | 唯一索引，例如 MAIN, Defect。 |
| `name` | text | 仓库名称 | keep | 核心必填字段。 |
| `type` | text | 仓库类型 | keep | 默认 `'normal'`。 |
| `status` | text | 仓库启用状态 | keep | 默认 `'active'`。 |
| `remark` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 仓库ID | 无 | keep |
| `code` | text | 是 | 仓库编码 | 无 | keep |
| `name` | text | 是 | 仓库名称 | 无 | keep |
| `type` | text | 是 | 仓库类型 | `'normal'` | keep |
| `status` | text | 是 | 仓库启用状态 | `'active'` | keep |
| `factoryId` | text | 是 | 关联所属工厂ID；数据库物理列为 `factory_id` | 无 | need_add (v1_later) |
| `isVirtual` | integer | 后续新增时选填 | 是否为虚拟/逻辑仓 (0: 否, 1: 是)；数据库物理列为 `is_virtual` | `0` | need_add (v1_later) |
| `sortOrder` | integer | 后续新增时选填 | 排序号；数据库物理列为 `sort_order` | `0` | need_add (v1_later) |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'active'` | `active`, `inactive` | 仓库的主数据启用及停用状态。 |
| `type` | `'normal'` | `raw_material`, `finished_goods`, `wip`, `defective`, `outsourced`, `transit`, `virtual` | 仓库业务类型分类，包括原材料库、成品库、在制品库、不良品库、外协库、在途库、逻辑虚拟库。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 库区业务类型不够细化 | 当前默认值全为 `'normal'`，未做成品库与原材料库的硬性隔离 | 强定义 `type` 枚举，在发货与完工入库时做库区校验，防止误落库 | 否，但有利于库存质量控制 |

---

### 二、locations

#### 1. 业务定位
`locations` 是库位（货位）主数据表。库位归属于特定的仓库，用于更细粒度地定位物料和产品的摆放位置。V1 阶段可以先弱化库位管理（在业务单据中做选填处理），但表结构上仍需维护 `warehouseCode` 与库位编码的层级及绑定关系，它作为库存查询和流水的辅助属性。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 库位唯一ID | keep | 主键。 |
| `warehouseCode` | text | 关联仓库编码 | rename_later | 建议迁移为直接使用外键 `warehouse_id` 关联仓库主表。 |
| `code` | text | 库位唯一编码 | keep | 唯一索引。 |
| `name` | text | 库位名称 | keep | 核心必填字段。 |
| `status` | text | 库位状态 | keep | 默认 `'active'`。 |
| `remark` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 库位ID | 无 | keep |
| `warehouseCode` | text | 是 | 关联仓库编码 | 无 | rename_later |
| `warehouseId` | text | 后续新增时必填 | 关联仓库ID；数据库物理列为 `warehouse_id` | 无 | need_add (v1_later) |
| `code` | text | 是 | 库位编码 | 无 | keep |
| `name` | text | 是 | 库位名称 | 无 | keep |
| `isDefault` | integer | 后续新增时选填 | 是否为仓库默认库位 (0: 否, 1: 是)；数据库物理列为 `is_default` | `0` | need_add (v1_later) |
| `sortOrder` | integer | 后续新增时选填 | 排序号；数据库物理列为 `sort_order` | `0` | need_add (v1_later) |
| `status` | text | 是 | 库位启用状态 | `'active'` | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'active'` | `active`, `inactive` | 库位的启用及停用状态。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 使用 Code 关联仓库而非 ID 关联 | 目前 `locations.warehouseCode` 以文本编码形式关联仓库，不合规范 | V1 阶段保持现状减少变动，V1_later 阶段补充 `warehouse_id` 后做数据清洗迁移 | 是，多库区多工厂时 Code 可能冲突 |

---

### 三、inventory_holds

#### 1. 业务定位
`inventory_holds` 是库存锁定与冻结的唯一事实表（锁定台账）。当车间发生品质异常拦截、来料缺陷判定、客户紧急暂停发货等业务场景时，必须通过该表生成锁定事务。该表在锁定确认时，会直接触发可用库存减少、冻结库存增加；解冻或报废时则做相反逻辑。该表是冻结与解冻业务闭环的唯一数据源头。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 冻结单ID | keep | 主键。 |
| `holdNo` | text | 锁定业务单号 | keep | 用于前台和审计日志的识别编码。 |
| `itemId` | text | 物品ID | keep | 可以是 `products.id` 或 `materials.id`。 |
| `itemCode` | text | 物品编码快照 | keep | 历史快照，审计追溯用。 |
| `itemName` | text | 物品名称快照 | keep | 历史快照。 |
| `projectId` | text | 关联项目ID | keep | |
| `projectCode` | text | 项目编码快照 | keep | 历史快照。 |
| `customerId` | text | 关联客户ID | keep | |
| `customerName` | text | 客户名称快照 | keep | 历史快照。 |
| `warehouseId` | text | 仓库ID | keep | 外键。 |
| `warehouseName` | text | 仓库名称快照 | keep | 历史快照。 |
| `locationId` | text | 库位ID | keep | 外键。 |
| `locationCode` | text | 库位编码快照 | keep | 历史快照。 |
| `holdQuantity` | integer | 冻结总量 | keep | 最初锁定的库存数量。 |
| `processedQuantity` | integer | 已处理数量 | keep | 累计已解冻释放或直接报废的数量。 |
| `remainingQuantity` | integer | 剩余冻结数量 | keep | 仍在锁定中尚未处理的数量。 |
| `abnormalType` | text | 异常分类 | keep | 默认空字符串。 |
| `discoveryStage` | text | 发现阶段 | keep | 默认空字符串。 |
| `responsibleParty` | text | 责任划分方 | keep | 默认空字符串。 |
| `handlingPlan` | text | 品质/处理方案 | keep | 默认空字符串。 |
| `status` | text | 冻结单据状态 | keep | 默认 `'pending'`。 |
| `initiatorId` | text | 发起操作人ID | keep | 默认空字符串。 |
| `handlerId` | text | 处理人ID | keep | 默认空字符串。 |
| `foundAt` | text | 发现时间 | keep | |
| `expectedCloseAt` | text | 预计关闭时间 | keep | |
| `isDeliveryAffected` | boolean | 是否影响交付 | keep | 默认 `false`。 |
| `remark` | text | 备注说明 | keep | 默认空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 冻结单ID | 无 | keep |
| `holdNo` | text | 是 | 锁定业务单号 | 无 | keep |
| `itemId` | text | 是 | 物品ID (产品或原材料) | 无 | keep |
| `itemCode` | text | 否 | 物品编码快照 | `''` | keep |
| `itemName` | text | 否 | 物品名称快照 | `''` | keep |
| `projectId` | text | 否 | 关联项目ID | 无 | keep |
| `projectCode` | text | 否 | 项目编码快照 | `''` | keep |
| `customerId` | text | 否 | 关联客户ID | 无 | keep |
| `customerName` | text | 否 | 客户名称快照 | `''` | keep |
| `warehouseId` | text | 是 | 仓库ID | 无 | keep |
| `warehouseName` | text | 否 | 仓库名称快照 | `''` | keep |
| `locationId` | text | 否 | 库位ID | 无 | keep |
| `locationCode` | text | 否 | 库位编码快照 | `''` | keep |
| `holdQuantity` | integer | 是 | 冻结数量 | `0` | keep |
| `processedQuantity` | integer | 是 | 已处理数量 | `0` | keep |
| `remainingQuantity` | integer | 是 | 剩余冻结数量 | `0` | keep |
| `abnormalType` | text | 否 | 异常分类 | `''` | keep |
| `discoveryStage` | text | 否 | 发现阶段 | `''` | keep |
| `responsibleParty` | text | 否 | 责任划分方 | `''` | keep |
| `handlingPlan` | text | 否 | 处理方案 | `''` | keep |
| `status` | text | 是 | 状态 | `'pending'` | keep |
| `initiatorId` | text | 否 | 发起操作人ID | `''` | keep |
| `handlerId` | text | 否 | 处理人ID | `''` | keep |
| `foundAt` | text | 否 | 发现时间 | 无 | keep |
| `expectedCloseAt` | text | 否 | 预计关闭时间 | 无 | keep |
| `isDeliveryAffected` | integer | 是 | 是否影响交付 (0: 否, 1: 是) | `0` | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'pending'` | `pending`, `held`, `partially_processed`, `released`, `scrapped`, `closed`, `cancelled` | 冻结单据的流转状态，锁定生效设为 `held`。已释放设为 `released`，已报废设为 `scrapped`。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 库存锁定/冻结状态与库存余额状态重名 | 代码及数据库中对异常结存有 `'frozen'` / `'held'` / `'scrap'` / `'scrapped'` 混用现象 | V1 阶段将冻结单状态归拢为 `held` (已冻结) 和 `scrapped` (已报废)，禁止使用 `frozen` / `scrap` 等歧义字符 | 是，影响可用库存计算 |

---

### 四、receipts

#### 1. 业务定位
`receipts` 是标准入库单主表。V1 阶段中所有的原材料来料入库、产成品完工入库、车间生产退料入库、盘盈入库动作都必须通过 `receipts + receipt_items` 进行记录。该表本身是头信息，不直接改变库存，只有当入库单状态更新为 `confirmed` 时，服务层解析明细并调用库存账目写入，从而发生库存余额增加及流水记录。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 入库主表ID | keep | 主键。 |
| `code` | text | 入库单编码 | keep | 唯一索引，例如 RCV-年月日-序号。 |
| `sourceType` | text | 入库单来源 | keep | 默认 `'manual'`。 |
| `status` | text | 单据状态 | keep | 默认 `'draft'`，需要统一状态枚举。 |
| `receivedDate` | text | 实际入库接收日期 | keep | 必填项。 |
| `notes` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdBy` | text | 创建人 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 入库单ID | 无 | keep |
| `code` | text | 是 | 入库单单号 | 无 | keep |
| `sourceType` | text | 是 | 入库单业务来源 | `'manual'` | keep |
| `status` | text | 是 | 单据状态 | `'draft'` | keep |
| `receivedDate` | text | 是 | 实际入库接收日期 | 无 | keep |
| `sourceId` | text | 后续新增时选填 | 关联的源单主键ID；数据库物理列为 `source_id` | 无 | need_add (v1_later) |
| `sourceNo` | text | 后续新增时选填 | 关联的源单号快照；数据库物理列为 `source_no` | 无 | need_add (v1_later) |
| `confirmedAt` | text | 后续新增时选填 | 确认审核入库时间；数据库物理列为 `confirmed_at` | 无 | need_add (v1_later) |
| `confirmedBy` | text | 后续新增时选填 | 确认审核入库人；数据库物理列为 `confirmed_by` | 无 | need_add (v1_later) |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdBy` | text | 否 | 创建人 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'draft'` | `draft`, `confirmed`, `cancelled` | 入库单据生命周期状态。 |
| `sourceType` | `'manual'` | `manual`, `supplier_delivery`, `production_report`, `return`, `stocktake_adjustment` | 划分不同入库来源。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 缺失源单追溯关联 | 缺少 `source_id` 和 `source_no`，导致无法与供应商送货计划或完工报工直接对账 | 建议在 V1_later 新增这两个字段，审核确认时进行数量双向勾稽校验 | 是，关系到入库能否自动结单 |

---

### 五、receipt_items

#### 1. 业务定位
`receipt_items` 是标准入库单明细表。它记录了每笔入库单下具体物品、项目归属、批次、入库仓库/库位和入库数量。它是入库落账时，库存变动数量计算的直接明细事实源。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 明细ID | keep | 主键。 |
| `receiptId` | text | 关联入库主表ID | keep | 外键关联。 |
| `itemId` | text | 物品ID | keep | 可以是产品ID或物料ID。 |
| `projectId` | text | 关联项目ID | keep | 允许为空（通用料）。 |
| `batchNo` | text | 批次号/炉号 | keep | 默认值为空字符串。 |
| `quantity` | integer | 入库数量 | keep | 必须大于 0。 |
| `warehouseId` | text | 仓库ID | keep | 关联外键。 |
| `locationId` | text | 库位ID | keep | 允许为空。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 明细ID | 无 | keep |
| `receiptId` | text | 是 | 关联入库单ID | 无 | keep |
| `itemId` | text | 是 | 原材料ID / 产成品ID | 无 | keep |
| `itemType` | text | 是 | 物品类型 (material / product)；数据库物理列为 `item_type` | 无 | need_add (lock_before_v1) |
| `itemCode` | text | 后续新增时选填 | 物品编码快照；数据库物理列为 `item_code` | `''` | need_add (v1_later) |
| `itemName` | text | 后续新增时选填 | 物品名称快照；数据库物理列为 `item_name` | `''` | need_add (v1_later) |
| `projectId` | text | 否 | 关联项目ID | 无 | keep |
| `batchNo` | text | 否 | 批次号 / 炉号，当前 V1 作为选填追溯字段，不作为主线必填字段。 | 无 | keep |
| `quantity` | integer | 是 | 实际接收数量 | 无 | keep |
| `unit` | text | 后续新增时选填 | 计量单位 | `'pcs'` | need_add (v1_later) |
| `warehouseId` | text | 是 | 入库仓库ID | 无 | keep |
| `locationId` | text | 否 | 入库库位ID | 无 | keep |
| `inventoryStatus` | text | 后续新增时选填 | 入库库存状态；数据库物理列为 `inventory_status` | `'available'` (available / inspection) | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 缺少物品类型导致反射关联困难 | 目前入库主键 `itemId` 可指向产品表或物料表，系统难以做反射类型定位 | 必须在 V1 锁库前新增 `item_type` 字段，以实现对不同表数据的快速分流与结账 | 是 |

---

### 六、issues

#### 1. 业务定位
`issues` 是标准出库单主表。V1 阶段中所有的车间领料出库、销售发货出库、品质报废出库、盘亏调整出库动作都必须通过 `issues + issue_items` 进行记录。该表本身是头信息，不直接改变库存，只有当出库单状态更新为 `confirmed` 时，服务层解析明细并调用库存账目写入，从而发生库存余额减少及流水记录。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 出库主表ID | keep | 主键。 |
| `code` | text | 出库单编码 | keep | 唯一索引，例如 ISS-年月日-序号。 |
| `sourceType` | text | 出库来源类型 | keep | 默认 `'manual'`。 |
| `status` | text | 单据状态 | keep | 默认 `'draft'`，需要统一状态枚举。 |
| `issuedDate` | text | 实际发料/出库日期 | keep | 必填项。 |
| `notes` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdBy` | text | 创建人 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 出库单ID | 无 | keep |
| `code` | text | 是 | 出库单单号 | 无 | keep |
| `sourceType` | text | 是 | 出库单业务来源 | `'manual'` | keep |
| `status` | text | 是 | 单据状态 | `'draft'` | keep |
| `issuedDate` | text | 是 | 实际发料出库时间 | 无 | keep |
| `sourceId` | text | 后续新增时选填 | 关联的源单主键ID；数据库物理列为 `source_id` | 无 | need_add (v1_later) |
| `sourceNo` | text | 后续新增时选填 | 关联的源单号快照；数据库物理列为 `source_no` | 无 | need_add (v1_later) |
| `confirmedAt` | text | 后续新增时选填 | 确认审核出库时间；数据库物理列为 `confirmed_at` | 无 | need_add (v1_later) |
| `confirmedBy` | text | 后续新增时选填 | 确认审核出库人；数据库物理列为 `confirmed_by` | 无 | need_add (v1_later) |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdBy` | text | 否 | 创建人 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'draft'` | `draft`, `confirmed`, `cancelled` | 出库单据生命周期状态。 |
| `sourceType` | `'manual'` | `manual`, `production_issue`, `shipment`, `scrap`, `stocktake_adjustment`, `return_to_supplier` | 划分不同出库来源。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 确认出库前缺少库存扣减校验 | 若无校验，出库直接确认会导致负库存或扣减错误 | 确认出库服务逻辑中必须增加当前可用库存 `quantity` 检查，确保充足，否则报错阻断 | 是 |

---

### 七、issue_items

#### 1. 业务定位
`issue_items` 是标准出库单明细表。它记录了每笔出库单下具体出库的物品、项目归属、批次、出库仓库/库位和数量。它是出库落账时，库存变动扣减数量计算的直接明细事实源。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 明细ID | keep | 主键。 |
| `issueId` | text | 关联出库主表ID | keep | 外键关联。 |
| `itemId` | text | 物品ID | keep | 可以是产品ID或物料ID。 |
| `projectId` | text | 关联项目ID | keep | 允许为空（通用料）。 |
| `batchNo` | text | 批次号/炉号 | keep | 默认值为空字符串。 |
| `quantity` | integer | 出库数量 | keep | 必须大于 0。 |
| `warehouseId` | text | 仓库ID | keep | 关联外键。 |
| `locationId` | text | 库位ID | keep | 允许为空。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 明细ID | 无 | keep |
| `issueId` | text | 是 | 关联出库单ID | 无 | keep |
| `itemId` | text | 是 | 原材料ID / 产成品ID | 无 | keep |
| `itemType` | text | 是 | 物品类型 (material / product)；数据库物理列为 `item_type` | 无 | need_add (lock_before_v1) |
| `itemCode` | text | 后续新增时选填 | 物品编码快照；数据库物理列为 `item_code` | `''` | need_add (v1_later) |
| `itemName` | text | 后续新增时选填 | 物品名称快照；数据库物理列为 `item_name` | `''` | need_add (v1_later) |
| `projectId` | text | 否 | 关联项目ID | 无 | keep |
| `batchNo` | text | 否 | 批次号 / 炉号，当前 V1 作为选填追溯字段，不作为主线必填字段。 | 无 | keep |
| `quantity` | integer | 是 | 实际出库数量 | 无 | keep |
| `unit` | text | 后续新增时选填 | 计量单位 | `'pcs'` | need_add (v1_later) |
| `warehouseId` | text | 是 | 出库仓库ID | 无 | keep |
| `locationId` | text | 否 | 出库库位ID | 无 | keep |
| `inventoryStatus` | text | 后续新增时选填 | 指定从哪类库存状态出库；数据库物理列为 `inventory_status` | `'available'` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 出库批次强匹配校验 | 生产领用和销售出库通常需要先进先出（FIFO）或批次追溯 | V1 阶段明细的 `batchNo` 强制由操作员或扫码枪在发料确认时回填，为后续账目扣减提供精确凭证 | 是 |

---

### 八、quality_issues

#### 1. 业务定位
`quality_issues` 是品质异常处理主单表。所有的来料异常、车间过程不良、出厂客退异常统统录入此表。此单据本身不直接改变库存，但如判定进行异常冻结，必须通过外键 `inventoryLockId` 强绑定 `inventory_holds` 表，由其触发库存状态变化。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 异常单ID | keep | 主键。 |
| `code` | text | 异常单号 | keep | 唯一索引，格式如 QI-年月日-序号。 |
| `sourceType` | text | 发现来源 | keep | 默认 `'manual'`。 |
| `sourceId` | text | 关联源单主键 | keep | 默认值为空字符串。 |
| `orderId` | text | 旧订单ID | deprecated | 旧订单体系遗留字段，应予废弃。 |
| `orderItemId` | text | 旧条目ID | deprecated | 旧明细条目外键，应予废弃。 |
| `workOrderId` | text | 工单ID | keep | 关联车间执行工单。 |
| `materialId` | text | 原材料ID | keep | 关联 `materials` 表。 |
| `productId` | text | 产成品ID | keep | 关联 `products` 表。 |
| `severity` | text | 严重程度 | keep | 默认 `'medium'`。 |
| `status` | text | 异常单状态 | keep | 默认 `'open'`，需要统一状态枚举。 |
| `title` | text | 异常标题 | keep | 必填项。 |
| `description` | text | 异常现象描述 | keep | 默认值为空字符串。 |
| `quantity` | integer | 异常数量 | keep | 默认值 0。 |
| `freezeId` | text | 旧冻结外键 | deprecated | 旧冻结外键，一律废弃。 |
| `inventoryLockId` | text | 品质锁库ID | keep | 关联 `inventory_holds.id` 的核心外键。 |
| `handlingMethod` | text | 最终处理方案 | keep | 默认值为空字符串。 |
| `warehouseCode` | text | 仓库编码快照 | rename_later | 建议迁移至外键 `warehouseId` 关联。 |
| `locationCode` | text | 库位编码快照 | rename_later | 建议迁移至外键 `locationId` 关联。 |
| `batchNo` | text | 异常批次号 | keep | 默认值为空字符串。 |
| `owner` | text | 负责人姓名 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |
| `closedAt` | text | 关闭时间 | keep | 允许为空。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 异常单主键ID | 无 | keep |
| `code` | text | 是 | 异常单单号 | 无 | keep |
| `sourceType` | text | 是 | 单据来源 | `'manual'` | keep |
| `sourceId` | text | 否 | 来源表记录ID | 无 | keep |
| `orderId` | text | 否 | 旧订单ID（已废弃） | 无 | deprecated |
| `orderItemId` | text | 否 | 旧订单明细ID（已废弃） | 无 | deprecated |
| `workOrderId` | text | 否 | 派工派发工单ID | 无 | keep |
| `materialId` | text | 否 | 关联原材料物料ID | 无 | keep |
| `productId` | text | 否 | 关联产品ID | 无 | keep |
| `severity` | text | 是 | 严重程度 | `'medium'` | keep |
| `status` | text | 是 | 单据处理状态 | `'open'` | keep |
| `title` | text | 是 | 标题 | 无 | keep |
| `description` | text | 否 | 异常描述说明 | `''` | keep |
| `quantity` | integer | 是 | 异常涉及数量 | `0` | keep |
| `freezeId` | text | 否 | 旧冻结外键（已废弃） | 无 | deprecated |
| `inventoryLockId` | text | 否 | 关联锁定冻结ID | 无 | keep |
| `handlingMethod` | text | 否 | 最终判定处理方式 | `''` | keep |
| `warehouseCode` | text | 否 | 仓库编码快照 | 无 | rename_later |
| `warehouseId` | text | 后续新增时选填 | 仓库ID；数据库物理列为 `warehouse_id` | 无 | need_add (v1_later) |
| `locationCode` | text | 否 | 库位编码快照 | 无 | rename_later |
| `locationId` | text | 后续新增时选填 | 库位ID；数据库物理列为 `location_id` | 无 | need_add (v1_later) |
| `batchNo` | text | 否 | 批次号 / 炉号，当前 V1 作为选填追溯字段，不作为主线必填字段。 | 无 | keep |
| `owner` | text | 否 | 负责人姓名 | `''` | keep |
| `closedAt` | text | 否 | 关闭时间 | 无 | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'open'` | `open`, `confirmed`, `frozen`, `processing`, `resolved`, `closed`, `cancelled` | 品质异常单处理流程，冻结拦截置为 `frozen`（此时必须强绑定生效的锁定记录，解冻前不得关闭单据）。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 冻结触发时异常单状态与库存状态的级联保障 | 当质量单状态置为 `frozen` 时，必须保证在 `inventory_holds` 中生成生效的冻结记录，且 `inventoryLockId` 不能为空。若存在未处理的剩余冻结数量，质量单在业务规则上不得强行 `closed`（关闭前必须先解冻或报废） | 统一判定解冻/报废完结后再允许结单 | 是 |

---

### 九、issue_actions

#### 1. 业务定位
`issue_actions` 是质量异常处理的动作日志表。每一次对异常单的确认、冻结、解冻、报废、关闭都需在此表持久化留痕。该表属于记录性质的过程审计表，不直接参与库存数量运算，仅用作责任追溯与操作追踪。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 日志ID | keep | 主键。 |
| `issueId` | text | 质量单ID | keep | 外键关联。 |
| `action` | text | 处理动作 | keep | 核心字段，例如 confirm, close。 |
| `message` | text | 动作日志信息 | keep | 默认值为空字符串。 |
| `actor` | text | 操作员 | keep | 默认值为空字符串。 |
| `createdAt` | text | 操作时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 动作日志主键ID | 无 | keep |
| `issueId` | text | 是 | 关联品质异常单ID | 无 | keep |
| `action` | text | 是 | 执行动作类型 | 无 | keep |
| `message` | text | 否 | 动作说明描述 | `''` | keep |
| `actor` | text | 是 | 操作员姓名 | 无 | keep |
| `actionType` | text | 后续新增时选填 | 操作归类 (如 freeze / scrap)；数据库物理列为 `action_type` | `''` | need_add (v1_later) |
| `quantity` | integer | 后续新增时选填 | 动作涉及数量 | `0` | need_add (v1_later) |
| `relatedTransactionId` | text | 后续新增时选填 | 关联的库存变动流水ID；数据库物理列为 `related_transaction_id` | 无 | need_add (v1_later) |
| `relatedHoldId` | text | 后续新增时选填 | 关联的锁定冻结ID；数据库物理列为 `related_hold_id` | 无 | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `action` | 无 | `create`, `confirm`, `freeze`, `unfreeze`, `scrap`, `update`, `close`, `cancel`, `comment` | 详细操作步骤动作类型记录。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 缺乏与库存流水直接勾稽的外键 | 当动作涉及“判定报废”或“判定解冻”时，无法直接关联到最终落账的库存变动流水 | V1_later 建议补充 `related_transaction_id` 强关联，防止虚报处理结果 | 否 |

---

### 十、shipments

#### 1. 业务定位
`shipments` 是销售发货单主表。它作为销售交付出库的唯一事实源，记录发货单头信息。当发货单被审核确认（`confirmed`）时，系统读取明细并执行出库，同步扣减库存并自动回写需求明细行 `demand_lines` 的已发货/未发货数量，更新订单流转状态。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 发货单ID | keep | 主键。 |
| `code` | text | 发货单号 | keep | 唯一索引，格式如 SHP-年月日-序号。 |
| `deliveryPlanId` | text | 送货计划ID | keep | 允许为空。 |
| `orderId` | text | 旧订单ID | deprecated | 旧订单体系遗留字段，应予废弃。 |
| `orderLineId` | text | 旧订单行ID | deprecated | 旧订单行外键，应予废弃。 |
| `orderItemId` | text | 旧条目外键 | deprecated | 旧条目外键，一律废弃。 |
| `demandId` | text | 需求主表ID | keep | 关联 `customer_demands` 主单。 |
| `demandLineId` | text | 需求明细ID | keep | 关联 `demand_lines` 行级外键。 |
| `productId` | text | 发货产品ID | need_review | 头表存储产品ID。多品发货时冲突，应迁移至子表 `shipment_items` 维护。 |
| `warehouseCode` | text | 发货仓库编码 | rename_later | 建议迁移至外键 `warehouseId` 关联。 |
| `locationCode` | text | 发货库位编码 | rename_later | 建议迁移至外键 `locationId` 关联。 |
| `batchNo` | text | 发货批次号 | keep | 默认值为空字符串。 |
| `quantity` | integer | 发货数量 | need_review | 头表存储发货数。多品发货时冲突，建议统一走子表。 |
| `status` | text | 单据状态 | keep | 默认 `'created'`。 |
| `shippedAt` | text | 实际出库发货日期 | keep | 允许为空。 |
| `confirmedBy` | text | 确认审核人 | keep | 默认值为空字符串。 |
| `notes` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 发货单单头ID | 无 | keep |
| `code` | text | 是 | 发货单编码 | 无 | keep |
| `deliveryPlanId` | text | 否 | 送货计划ID | 无 | keep |
| `orderId` | text | 否 | 旧订单ID（已废弃） | 无 | deprecated |
| `orderLineId` | text | 否 | 旧订单行ID（已废弃） | 无 | deprecated |
| `orderItemId` | text | 否 | 旧条目外键（已废弃） | 无 | deprecated |
| `demandId` | text | 否 | 需求计划主单ID | 无 | keep |
| `demandLineId` | text | 否 | 需求计划行明细ID | 无 | keep |
| `productId` | text | 否 | 发货产品ID (旧冗余字段) | 无 | need_review |
| `warehouseCode` | text | 否 | 出库仓库编码 | 无 | rename_later |
| `locationCode` | text | 否 | 出库库位编码 | 无 | rename_later |
| `batchNo` | text | 否 | 出库批次号 | `''` | keep |
| `quantity` | integer | 否 | 销售发货总数 (旧冗余字段) | `0` | need_review |
| `status` | text | 是 | 单据流转状态 | `'created'` | keep |
| `shippedAt` | text | 否 | 实际发货时间 | 无 | keep |
| `confirmedBy` | text | 否 | 发货确认员姓名 | `''` | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'created'` | `created`, `confirmed`, `cancelled` | 单据确认使用 `confirmed`，确认后扣库并回写 `demand_lines` 发货数量。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 发货单单头 productId 和 quantity 的冗余设计 | 在同时存在 `shipments` 和 `shipment_items` 时，若只发单品，单头保留可简化写入，但对多品发货会产生语义冲突 | V1 阶段主线发货逻辑建议向 `shipment_items` 靠拢，逐步把单头的物品及数量字段判定为 `deprecated` | 是 |

---

### 十一、shipment_items

#### 1. 业务定位
`shipment_items` 是实际发货单的明细子表。它记录了每次发货出库的物品明细行，是多品合并发货的唯一可信计算事实源。发货确认时，系统逐行扣减可用库存，并相应回写 `demand_lines` 的已发/未发数量。

**与主表的 demandLineId 兼容规则**：
- 如果 V1 暂时只支持单品单需求行发货，且 `shipments.demandLineId` 已存在，则可以短期兼容主表上的 `demandLineId`。
- 一旦启用 `shipment_items` 明细发货，必须以 `shipment_items.demandLineId` 作为发货回写需求行的唯一可信来源。
- **规则**：单头字段可兼容旧逻辑，明细字段是未来主线。不允许同时存在两个互相冲突的需求行来源。如果明细存在，则优先信任明细。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 明细ID | keep | 主键。 |
| `shipmentId` | text | 关联发货主表ID | keep | 外键关联。 |
| `orderItemId` | text | 旧订单条目ID | deprecated | 旧订单体系遗留字段，应予废弃。 |
| `productId` | text | 产品ID | keep | 关联 `products` 表。 |
| `quantity` | integer | 发货数量 | keep | 必须大于 0。 |
| `batchNo` | text | 发货批次/炉号 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 明细ID | 无 | keep |
| `shipmentId` | text | 是 | 发货单ID | 无 | keep |
| `orderItemId` | text | 否 | 旧条目外键（已废弃） | 无 | deprecated |
| `productId` | text | 是 | 关联发货产品ID | 无 | keep |
| `quantity` | integer | 是 | 发货出库数量 | 无 | keep |
| `batchNo` | text | 否 | 发货批次号，当前 V1 作为选填追溯字段，不作为主线必填字段。 | 无 | keep |
| `demandLineId` | text | 是 | 关联需求计划行ID；数据库物理列应为 `demand_line_id` | 无 | need_add (lock_before_v1) |
| `warehouseId` | text | 后续新增时选填 | 扣减库存仓库ID；数据库物理列应为 `warehouse_id` | 无 | need_add (v1_later) |
| `locationId` | text | 后续新增时选填 | 扣减库存库位ID；数据库物理列应为 `location_id` | 无 | need_add (v1_later) |
| `unit` | text | 后续新增时选填 | 单位 | `'pcs'` | need_add (v1_later) |
| `productCode` | text | 后续新增时选填 | 发货产品编码快照；数据库物理列应为 `product_code` | `''` | need_add (v1_later) |
| `productName` | text | 后续新增时选填 | 发货产品名称快照；数据库物理列应为 `product_name` | `''` | need_add (v1_later) |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 明细行级缺失需求行 ID 的致命漏洞 | 当前字段审计里只有旧订单的 `orderItemId`，没有关联新需求明细行 `demandLineId`，无法实现回写发货数 | 必须在 V1 锁库前新增 `demandLineId` 强外键关联且必填，确保发货能精确回写需求计划（数据库物理列应为 `demand_line_id`） | 是 |

---

### 十二、work_order_steps

#### 1. 业务定位
`work_order_steps` 是工单下的工序步骤表。每个工单生成时，应根据产品工艺路线生成一组工序步骤快照。它是车间现场扫码报工、工序汇报及良率控制的唯一明细事实源，不直接改变成品库存，但参与在制品（WIP）数量控制。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 步骤唯一ID | keep | 主键。 |
| `workOrderId` | text | 关联工单ID | keep | 外键。 |
| `processId` | text | 工序类别ID | keep | 关联 `processes` 表。 |
| `stepOrder` | integer | 工序顺序 | keep | |
| `name` | text | 工序名称快照 | keep | 工序名称快照。 |
| `plannedQuantity` | integer | 计划生产数 | keep | |
| `completedQuantity` | integer | 工序合格完成数 | keep | 默认值 0，建议明确定义为本工序合格产出数。 |
| `defectQuantity` | integer | 不良品数 | keep | 默认值 0。 |
| `scrapQuantity` | integer | 报废品数 | keep | 默认值 0。 |
| `status` | text | 执行状态 | keep | 默认 `'pending'`，需要统一状态枚举。 |
| `machineId` | text | 分配的机器ID | keep | 允许为空。 |
| `startedAt` | text | 实际开工时间 | keep | 允许为空。 |
| `completedAt` | text | 实际完工时间 | keep | 允许为空。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 步骤ID | 无 | keep |
| `workOrderId` | text | 是 | 关联工单ID | 无 | keep |
| `processId` | text | 是 | 关联工序ID | 无 | keep |
| `stepOrder` | integer | 是 | 工序执行顺序 | 无 | keep |
| `name` | text | 是 | 工序名称 | 无 | keep |
| `plannedQuantity` | integer | 是 | 工序排程计划数 | 无 | keep |
| `completedQuantity` | integer | 是 | 工序合格数 (完工数) | `0` | keep |
| `defectQuantity` | integer | 是 | 工序不良数 | `0` | keep |
| `scrapQuantity` | integer | 是 | 工序报废数 | `0` | keep |
| `status` | text | 是 | 工序执行状态 | `'pending'` | keep |
| `machineId` | text | 否 | 分配的物理机器ID | 无 | keep |
| `reported_quantity` | integer | 后续新增时选填 | 该工序累积报工总数 | `0` | need_review |
| `processCode` | text | 后续新增时选填 | 工序编码快照；数据库物理列为 `process_code` | `''` | need_add (v1_later) |
| `machineCode` | text | 后续新增时选填 | 机器编码快照；数据库物理列为 `machine_code` | `''` | need_add (v1_later) |
| `operator` | text | 后续新增时选填 | 当前首选操作工姓名 | `''` | need_add (v1_later) |
| `qualityRequired` | integer | 后续新增时选填 | 本工序是否强检 (0: 否, 1: 是)；数据库物理列为 `quality_required` | `0` | need_add (v1_later) |
| `startedAt` | text | 否 | 实际开工日期时间 | 无 | keep |
| `completedAt` | text | 否 | 实际完工日期时间 | 无 | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `status` | `'pending'` | `pending`, `running`, `completed`, `skipped`, `cancelled` | 工序行级别状态流转。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 工序合格数命名语义模糊 | `completedQuantity` 是否直接等同于“合格完工数”？若后续引入 `good_quantity` 会导致双重表达 | V1 阶段统一将 `completedQuantity` 严格解释为本工序最终合格数，禁止再引入 `good_quantity` 导致字段重叠 | 是 |

---

### 十三、operation_reports

#### 1. 业务定位
`operation_reports` 是工序报工记录的事实表（报工日志）。车间现场每次进行 PDA 扫码、手动录入、翻工报工或报废申报，都必须生成一条流水事实。该表本身是过程记录，并不直接改变库存。末道工序合格报工后，应优先生成成品入库建议单或待确认入库单，状态为 `draft`。仓库确认后，`receipts.status` 才能变为 `confirmed`，并由库存服务写入 `inventory_transactions` 和 `inventory_balances`。

型材库存扣减优先发生在生产领料 / 投料确认环节。如果 V1 暂时没有独立领料流程，可以在首工序报工确认时按 BOM 扣减，但必须设置防重扣机制，不能在每次报工时重复扣减。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 报工ID | keep | 主键。 |
| `reportNo` | text | 报工单据号 | keep | 唯一索引，例如 OPR-年月日-序号。 |
| `cardId` | text | 关联流程卡ID | keep | 允许为空。 |
| `cardCode` | text | 流程卡条码 | keep | 默认值为空字符串。 |
| `productionOrderId` | text | 关联工单ID | rename_later | 字段命名非标，应映射改名为 `workOrderId`。 |
| `operationId` | text | 关联步骤工序ID | keep | 指向 `work_order_steps.id`。 |
| `operationName` | text | 工序名称快照 | keep | 报工时快照。 |
| `reportType` | text | 报工类型 | keep | 必填项。 |
| `goodQty` | integer | 合格数 | keep | 默认值 0。 |
| `defectQty` | integer | 不良品数 | keep | 默认值 0。 |
| `scrapQty` | integer | 报废数 | keep | 默认值 0。 |
| `reworkQty` | integer | 翻工数 | keep | 默认值 0。 |
| `operator` | text | 报工操作员 | keep | 默认值为空字符串。 |
| `inspector` | text | 质检人姓名 | keep | 默认值为空字符串。 |
| `equipment` | text | 加工设备快照名称 | rename_later | 命名非标，建议改名为 `machineId` 外键关联。 |
| `defectReason` | text | 不良原因说明 | keep | 默认值为空字符串。 |
| `manualReason` | text | 手工补报原因 | keep | 默认值为空字符串。 |
| `remark` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdBy` | text | 填报人 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 报工日志ID | 无 | keep |
| `reportNo` | text | 是 | 报工单号 | 无 | keep |
| `cardId` | text | 否 | 流程卡主键 | 无 | keep |
| `cardCode` | text | 否 | 流程卡条码快照 | `''` | keep |
| `productionOrderId` | text | 是 | 关联派工单 (实际应映射为 `workOrderId`) | 无 | rename_later |
| `workOrderId` | text | 后续新增时必填 | 关联派工工单ID；数据库物理列为 `work_order_id` | 无 | need_add (v1_later) |
| `operationId` | text | 是 | 关联工序步骤ID | 无 | keep |
| `operationName` | text | 是 | 工序名称快照 | 无 | keep |
| `reportType` | text | 是 | 报工类型 | 无 | keep |
| `goodQty` | integer | 是 | 本次报工合格数 | `0` | keep |
| `defectQty` | integer | 是 | 本次报工不良数 | `0` | keep |
| `scrapQty` | integer | 是 | 本次报废数量 | `0` | keep |
| `reworkQty` | integer | 是 | 本次翻工/返修数 | `0` | keep |
| `operator` | text | 是 | 报工操作员 | 无 | keep |
| `inspector` | text | 否 | 质检判定员 | `''` | keep |
| `equipment` | text | 否 | 加工设备快照名称 | `''` | rename_later |
| `machineId` | text | 后续新增时选填 | 加工机器设备ID；数据库物理列为 `machine_id` | 无 | need_add (v1_later) |
| `defectReason` | text | 否 | 不良品产生原因 | `''` | keep |
| `manualReason` | text | 否 | 手工填报原因 | `''` | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdBy` | text | 否 | 填报人 | `''` | keep |
| `createdAt` | text | 是 | 填报时间 | 当前时间戳 | keep |

#### 4. 状态枚举
| 字段 | 当前默认值 | 建议枚举 | 说明 |
|---|---|---|---|
| `reportType` | 无 | `scan`, `manual`, `rework`, `scrap`, `adjustment` | 报工动作类型划分。 |

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| `productionOrderId` 和 `equipment` 字段非标命名 | `productionOrderId` 容易与宏观计划计划混淆，且设备字段为 `equipment` 字符串 | V1_later 逐步将其重构为 `workOrderId` 和 `machineId` 外键，但在 V1 中可保留兼容层以保证接口编译通过 | 是 |

---

## 字段冲突清单

| 表 | 当前字段 | 问题 | 建议处理 |
|---|---|---|---|
| `locations`, `quality_issues`, `shipments` | `warehouseCode` vs `warehouseId` | 表中直接存了大量的 `warehouseCode` 文本，未通过 ID 物理外键对齐。 | V1 阶段保持现状，V1_later 补充 `warehouseId` 外键且逐步废弃 `warehouseCode` 关联。 |
| `inventory_balances`, `inventory_transactions`, `quality_issues`, `shipments` | `locationCode` vs `locationId` | 表中直接存了大量的 `locationCode` 文本，未建立 ID 物理外键。 | V1 阶段保持现状，V1_later 补充 `locationId` 并逐步废弃编码关联。 |
| `quality_issues`, `shipments`, `shipment_items` | `orderId / orderItemId / orderLineId` | 依然使用旧订单体系的主键，与 V1 需求单 `demandId / demandLineId` 混用。 | 将旧订单体系外键标记为 `deprecated`，新功能统一改用 `demandId` / `demandLineId`。 |
| `operation_reports` | `productionOrderId` | 字段名称为 `productionOrderId` 容易与宏观生产计划混淆，但实际存放的是工单主键。 | 建议重命名为 `workOrderId`，保留原字段做兼容，新功能强制写入 `workOrderId`。 |
| `operation_reports` | `equipment` | 使用字符串快照 `equipment` 记录加工设备，未指向 `machines.id` 主数据。 | 建议在 V1_later 增加 `machineId` 外键且对齐。 |
| `work_orders`, `work_order_steps`, `operation_reports` | `completedQuantity` vs `goodQty` | 工序中的完工数与报工明细的合格数缺少逻辑勾稽。 | 明确工序的 `completedQuantity` 为多次报工 `goodQty` 的汇总，不再在工序上引入 `good_quantity` 重叠。 |
| `quality_issues` | `freezeId` vs `inventoryLockId` | 两个字段均代表库存品质锁库外键，逻辑冗余冲突。 | 废弃并标记 `freezeId` 为 `deprecated`，强制且唯一使用 `inventoryLockId` 关联品质锁定表。 |
| `shipments` | `shipments.productId / quantity / batchNo` | 发货主表头冗余了产品和数量，与 `shipment_items` 发货明细子表重叠冲突。 | 多品发货时必须统一走 `shipment_items`，单头字段置空，后续升级完全废弃单头产品信息。 |

---

## 待补充字段清单

| 表 | 建议新增字段 | 原因 | 优先级 |
|---|---|---|---|
| `receipt_items` | `itemType` | 区分入库明细记录的是原材料(material)还是产品(product)以关联正确的表；数据库物理列为 `item_type`。 | `lock_before_v1` |
| `issue_items` | `itemType` | 区分出库明细记录是原材料(material)还是产品(product)；数据库物理列为 `item_type`。 | `lock_before_v1` |
| `shipment_items` | `demandLineId` | 核心发货追溯外键，确保发货扣减时精准回写销售需求行数量；数据库物理列应为 `demand_line_id`。 | `lock_before_v1` |
| `warehouses` | `factoryId` | 仓库必须明确归属于哪个工厂，以便按工厂组织数据隔离；数据库物理列为 `factory_id`。 | `v1_later` |
| `warehouses` | `isVirtual` | 标识是否为虚拟/逻辑仓库（如虚拟在途仓、外协虚拟仓）；数据库物理列为 `is_virtual`。 | `v1_later` |
| `warehouses` | `sortOrder` | 排序号，控制前台仓库列表展示顺序；数据库物理列为 `sort_order`。 | `v1_later` |
| `locations` | `warehouseId` | 库位强外键关联到仓库表，逐步替代原 `warehouseCode`；数据库物理列为 `warehouse_id`。 | `v1_later` |
| `locations` | `isDefault` | 标识是否为仓库的默认库位，用于入库时默认推荐；数据库物理列为 `is_default`。 | `v1_later` |
| `locations` | `sortOrder` | 排序号，控制前台库位列表展示顺序；数据库物理列为 `sort_order`。 | `v1_later` |
| `receipts` | `sourceId` | 记录生成入库单的源业务记录主键（如采购收料单ID、工单ID）；数据库物理列为 `source_id`。 | `v1_later` |
| `receipts` | `sourceNo` | 记录源业务单号快照，方便对账；数据库物理列为 `source_no`。 | `v1_later` |
| `receipts` | `confirmedAt` | 确认审核入库的系统时间；数据库物理列为 `confirmed_at`。 | `v1_later` |
| `receipts` | `confirmedBy` | 确认审核入库的操作员；数据库物理列为 `confirmed_by`。 | `v1_later` |
| `receipt_items` | `itemCode` | 物品编码快照，作为历史追溯和对账的冗余备份；数据库物理列为 `item_code`。 | `v1_later` |
| `receipt_items` | `itemName` | 物品名称快照，便于列表直观展示；数据库物理列为 `item_name`。 | `v1_later` |
| `receipt_items` | `unit` | 计量单位，用以检验入库单位是否与库存主数据单位一致。 | `v1_later` |
| `receipt_items` | `inventoryStatus` | 入库库存状态（如默认 available，或直接入待检区/冻结状态）；数据库物理列为 `inventory_status`。 | `v1_later` |
| `issues` | `sourceId` | 记录生成出库单的源业务记录主键（如生产领料计划ID、发货计划ID）；数据库物理列为 `source_id`。 | `v1_later` |
| `issues` | `sourceNo` | 记录源业务单单号快照；数据库物理列为 `source_no`。 | `v1_later` |
| `issues` | `confirmedAt` | 确认审核出库的系统时间；数据库物理列为 `confirmed_at`。 | `v1_later` |
| `issues` | `confirmedBy` | 确认审核出库的操作员；数据库物理列为 `confirmed_by`。 | `v1_later` |
| `issue_items` | `itemCode` | 物品编码快照，冗余追溯使用；数据库物理列为 `item_code`。 | `v1_later` |
| `issue_items` | `itemName` | 物品名称快照；数据库物理列为 `item_name`。 | `v1_later` |
| `issue_items` | `unit` | 计量单位，用于校验。 | `v1_later` |
| `issue_items` | `inventoryStatus` | 指定从哪种库存状态（如 available/held/scrapped）扣减库存；数据库物理列为 `inventory_status`。 | `v1_later` |
| `quality_issues` | `warehouseId` | 品质异常库存当前所处的仓库ID外键；数据库物理列为 `warehouse_id`。 | `v1_later` |
| `quality_issues` | `locationId` | 品质异常库存当前所处的库位ID外键；数据库物理列为 `location_id`。 | `v1_later` |
| `issue_actions` | `actionType` | 操作动作大类归化（如 freeze/unfreeze/scrap/close），方便报表统计；数据库物理列为 `action_type`。 | `v1_later` |
| `issue_actions` | `quantity` | 该处理动作涉及的具体数量。 | `v1_later` |
| `issue_actions` | `relatedTransactionId` | 关联解冻或报废时在库存台账里落账的流水ID，实现闭环追溯；数据库物理列为 `related_transaction_id`。 | `v1_later` |
| `issue_actions` | `relatedHoldId` | 关联对应的锁定冻结记录ID；数据库物理列为 `related_hold_id` | `v1_later` |
| `shipment_items` | `warehouseId` | 明细行发货扣减的具体仓库ID，支持单头多库位发货；数据库物理列为 `warehouse_id`。 | `v1_later` |
| `shipment_items` | `locationId` | 明细行发货扣减的具体库位ID；数据库物理列为 `location_id`。 | `v1_later` |
| `shipment_items` | `unit` | 发货数量的计量单位。 | `v1_later` |
| `shipment_items` | `productCode` | 产品编码快照；数据库物理列为 `product_code`。 | `v1_later` |
| `shipment_items` | `productName` | 产品名称快照；数据库物理列为 `product_name`。 | `v1_later` |
| `work_order_steps` | `processCode` | 工序编码快照，确保业务路线快照性；数据库物理列为 `process_code`。 | `v1_later` |
| `work_order_steps` | `machineCode` | 锁定设备编码快照；数据库物理列为 `machine_code`。 | `v1_later` |
| `work_order_steps` | `operator` | 首选操作员快照/派发人。 | `v1_later` |
| `work_order_steps` | `qualityRequired` | 该工序是否需要首检/巡检强品质控制；数据库物理列为 `quality_required`。 | `v1_later` |
| `operation_reports` | `workOrderId` | 关联工单ID，重命名修正；数据库物理列为 `work_order_id`。 | `v1_later` |
| `operation_reports` | `machineId` | 用于关联实际执行加工的设备主数据ID；数据库物理列为 `machine_id`。 | `v1_later` |
| `inventory_balances` | `多批次库存追踪` | 支持按原材料批号/热处理炉号等多级批次追溯。 | `v2` |
| `locations` | `多库位策略` | 支持系统自动推荐上架、拣货的库位策略。 | `v2` |
| `operation_reports` | `PDA扫码日志明细` | 详细记录PDA每次扫码的信号强度、读取时间、RFID等硬件数据。 | `v2` |
| `issue_actions` | `图片附件独立绑定` | 品质处理动作支持直接绑定多张现场图片或检测附件。 | `v2` |
| `quality_issues` | `多级审批流` | 针对重大质量异常单，支持多级线上审批流会签与判定流程。 | `v2` |

---

## 待统一状态清单

| 表 | 当前状态 | 建议状态 | 使用位置 | 是否需要迁移 |
|---|---|---|---|---|
| `inventory_holds` | `held`, `pending`, `released`, `scrapped`, `closed` (存在 frozen 混用) | `pending`, `held`, `partially_processed`, `released`, `scrapped`, `closed`, `cancelled` | `inventory-ledger.service.ts` | 是 (迁移旧流水及冻结数据中的 frozen 为 held，scrap 为 scrapped) |
| `receipts` | `received`, `planned` | `draft`, `confirmed`, `cancelled` | `order-flow.service.ts` | 是 |
| `issues` | `draft` | `draft`, `confirmed`, `cancelled` | `order-flow.service.ts` | 是 |
| `quality_issues` | `open`, `frozen`, `closed` | `open`, `confirmed`, `frozen`, `processing`, `resolved`, `closed`, `cancelled` | `order-flow.service.ts` | 是 |
| `shipments` | `created`, `confirmed`, `cancelled` | `created`, `confirmed`, `cancelled` | `shipment.service.ts` | 否 |
| `work_order_steps` | `pending`, `running`, `completed` | `pending`, `running`, `completed`, `skipped`, `cancelled` | `resource-api.service.ts` | 是 |
| `operation_reports` | `scan`, `manual`, `rework`, `scrap` (指 reportType 类型) | `scan`, `manual`, `rework`, `scrap`, `adjustment` | `resource-api.service.ts` | 否 |

---

## 必须人工确认的问题

| 问题 | 涉及表 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| **1. warehouseCode 是否在 V1 保留，还是迁移到 warehouseId** | `locations`, `quality_issues`, `shipments` | V1 保留 `warehouseCode` 文本，V1_later 新增 `warehouseId` 物理外键并进行全局数据清洗。 | 是 |
| **2. locationCode 是否在 V1 保留，还是迁移到 locationId** | `inventory_balances`, `inventory_transactions`, `quality_issues`, `shipments` | V1 保持现状，V1_later 统一改为 `locationId` 物理外键设计。 | 是 |
| **3. quality_issues.freezeId 是否废弃，只保留 inventoryLockId** | `quality_issues` | 彻底弃用 `freezeId` 并标记为 `deprecated`，强关联锁定表唯一使用 `inventoryLockId` 字段。 | 是 |
| **4. shipments 头字段是否保留 productId/quantity/batchNo** | `shipments` | 发货单多品发货时统一将明细写入 `shipment_items` 并置空单头物品字段，单头字段在 V1_later 中正式废弃。 | 是 |
| **5. shipment_items 是否必须新增 demandLineId** | `shipment_items` | 必须新增 `demandLineId` (lock_before_v1) 用以保证销售交付出库后能够准确回写销售明细数量（数据库物理列应为 `demand_line_id`）。 | 是 |
| **6. operation_reports.productionOrderId 是否应改为 workOrderId** | `operation_reports` | V1_later 中重命名为 `workOrderId` 并强绑定派工工单表，目前可加兼容处理。 | 是 |
| **7. operation_reports.operationId 是否指向工序主数据，还是工单步骤** | `operation_reports` | 应当指向 `work_order_steps.id`，并在底层逻辑中加入校验，确保对应步骤确属该工单。 | 是 |
| **8. work_order_steps.completedQuantity 是否等同于合格数量** | `work_order_steps` | 明确为过程报工合格完工量累计，不应该在步骤上重复新增 `good_quantity`。 | 是 |
| **9. 末工序报工是否自动触发成品入库** | `operation_reports`, `receipts` | 末道工序合格报工后，应优先生成成品入库建议单或待确认入库单，状态为 `draft`。仓库确认后，`receipts.status` 才能变为 `confirmed`，并由库存服务写入 `inventory_transactions` 和 `inventory_balances`。 | 是 |
| **10. 报工时是否自动扣减型材库存** | `operation_reports`, `issues` | 型材库存扣减优先发生在生产领料 / 投料确认环节。如果 V1 暂时没有独立领料流程，可以在首工序报工确认时按 BOM 扣减，但必须设置防重扣机制，不能在每次报工时重复扣减。 | 是 |
