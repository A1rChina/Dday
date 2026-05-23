> 注意：本文件为 Dday V1 数据库设计历史草案，仅保留用于追溯讨论过程。Dday V1 数据库结构的唯一权威版本为 `docs/DATABASE_LOCK_V1.md`。后续开发、字段判断、状态枚举、数据库变更申请，均必须以 `DATABASE_LOCK_V1.md` 为准。

# Dday V1 核心表字段草案

## 字段状态定义

| 状态 | 含义 |
|---|---|
| keep | 字段保留，当前字段名和语义基本可接受 |
| rename_later | 字段语义可用，但字段名不准确，后续需要改名 |
| deprecated | 字段后续废弃，新逻辑不应继续依赖 |
| need_add | V1 应该补充该字段，但本次不新增 |
| need_review | 字段含义不清，需要人工确认 |

---

## 核心数据表设计及审计

### 1. customers

#### 1. 业务定位
`customers` 是客户主数据的唯一权威表。系统后续所有与客户相关的业务（包括项目归属、需求订单、发货通知等）将不再写入旧的 `parties` 表，均以此表为准。客户 ID 统一使用 `customers.customerId` 作为外键进行关联。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `customerId` | text | 客户主键ID | keep | 核心主键，用于全局关联。 |
| `customerName` | text | 客户全称 | keep | 核心字段，支持导入及展示。 |
| `customerShortName` | text | 客户简称 | keep | 默认值为空字符串。 |
| `contactPerson` | text | 联系人 | keep | 默认值为空字符串。 |
| `contactPhone` | text | 联系电话 | keep | 默认值为空字符串。 |
| `deliveryAddress` | text | 默认送货地址 | keep | 默认值为空字符串。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `customerId` | text | 是 | 客户主键ID | 无 | keep |
| `customer_code` | text | 后续新增时必填 | 客户业务编码 (如 CUST-001) | 无 | need_add |
| `customerName` | text | 是 | 客户全称 | 无 | keep |
| `customerShortName` | text | 否 | 客户简称 | `''` | keep |
| `contactPerson` | text | 否 | 联系人 | `''` | keep |
| `contactPhone` | text | 否 | 联系电话 | `''` | keep |
| `deliveryAddress` | text | 否 | 默认送货地址 | `''` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 缺失客户编码字段 | 当前没有针对客户的业务编码（如 `customer_code`），只依赖 UUID 类型的 `customerId` | 在主数据中补充 `customer_code`，以便业务员输入与查询，并设置为唯一索引 | 是，影响主数据导入和订单列表的高效检索 |

---

### 2. profile_suppliers

#### 1. 业务定位
`profile_suppliers` 是型材厂商 / 供应商主数据的唯一权威表。系统后续所有原材料/型材的采购、供料及到货计划将不再向旧的 `parties` 表写入，供应商 ID 统一使用 `supplierId`。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `supplierId` | text | 供应商唯一ID | keep | 主键。 |
| `supplierName` | text | 供应商名称 | keep | 核心必填项。 |
| `supplierShortName` | text | 供应商简称 | keep | 默认值为空字符串。 |
| `contactPerson` | text | 联系人 | keep | 默认值为空字符串。 |
| `contactPhone` | text | 联系电话 | keep | 默认值为空字符串。 |
| `address` | text | 地址 | keep | 默认值为空字符串。 |
| `defaultLeadTime` | integer | 默认采购周期（天数） | keep | 默认为 0。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `remark` | text | 备注说明 | keep | 默认值为空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `supplierId` | text | 是 | 供应商唯一ID | 无 | keep |
| `supplier_code` | text | 后续新增时必填 | 供应商业务编码 (如 SUPP-001) | 无 | need_add |
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

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 缺少供应商编码 | 目前仅有 ID 缺少易读的 `supplier_code` | 新增 `supplier_code` 唯一索引字段，支持供应商匹配与数据对接 | 是，影响外部物料及采购明细导入 |

---

### 3. manufacturing_factories

#### 1. 业务定位
`manufacturing_factories` 是制造工厂主数据的唯一权威表。宜宾工厂、重庆工厂、外协厂等所有的工厂数据必须来自此表，以对计划、排产、库存实施物理和组织隔离。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `factoryId` | text | 工厂唯一ID | keep | 主键。 |
| `factoryName` | text | 工厂名称 | keep | 核心必填项。 |
| `factoryCode` | text | 工厂编码 | keep | 用于隔离和快速匹配，默认空字符串。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `remark` | text | 备注说明 | keep | 默认空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `factoryId` | text | 是 | 工厂唯一ID | 无 | keep |
| `factoryName` | text | 是 | 工厂名称 | 无 | keep |
| `factoryCode` | text | 是 | 工厂编码 | 无 | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `remark` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 物理工厂的库存关联 | 目前仓库（`warehouses`）和工厂（`factories`）仅以文本或编码形式对应，没有强外键关联 | 后续需要在 `warehouses` 中添加 `factory_id`，以实现工厂维度的库存自动过滤 | 是，影响按工厂派工时的物料齐套性校验 |

---

### 4. projects

#### 1. 业务定位
`projects` 是客户项目主数据表。系统内所有的项目必须能够明确关联客户，不得把项目与客户的关系散落在产品或需求明细行里作为唯一来源。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 项目唯一ID | keep | 主键。 |
| `code` | text | 项目编码 | keep | 业务识别码，必须唯一。 |
| `name` | text | 项目名称 | keep | 必填项。 |
| `party_id` | text | 往来单位关联ID | rename_later | 用于指向客户，但名称应改名为 `customer_id` 关联 `customers` 表。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `notes` | text | 备注说明 | keep | 默认空字符串。 |
| `created_at` | text | 创建时间 | keep | 标准蛇形命名，物理列一致。 |
| `updated_at` | text | 更新时间 | keep | 标准蛇形命名，物理列一致。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 项目唯一ID | 无 | keep |
| `code` | text | 是 | 项目编码 | 无 | keep |
| `name` | text | 是 | 项目名称 | 无 | keep |
| `customer_id` | text | 是 | 关联客户ID | 无 | rename_later (由 `party_id` 改名) |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `created_at` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updated_at` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 关联 `parties` 表的历史数据遗留 | 原本 `party_id` 允许为空且部分指向 `parties` 表 | 转换为 `customer_id` 并且设为必填，强制关联到 `customers` 表 | 是，如果为空会导致销售计划无法按客户维度归集 |

---

### 5. products

#### 1. 业务定位
`products` 是 CNC 加工后交付给客户的产成品主数据。该表代表最终销售产品，不表示原材料或型材。产品拥有工艺路线，并通过项目或客户维度进行业务隔离。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 产品唯一ID | keep | 主键。 |
| `code` | text | 产品编码 | keep | 唯一编码。 |
| `name` | text | 产品名称 | keep | 必填。 |
| `unit` | text | 计量单位 | keep | 默认 `'PCS'`。 |
| `process_route` | text | 工艺路线 | keep | 默认 `'[]'`。 |
| `notes` | text | 备注说明 | keep | 默认空字符串。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `created_at` | text | 创建时间 | keep | 标准蛇形命名，物理列一致。 |
| `updated_at` | text | 更新时间 | keep | 标准蛇形命名，物理列一致。 |
| `project_id` | text | 关联项目ID | keep | |
| `party_id` | text | 关联往来单位ID | deprecated | 历史遗留关联，V1 建议完全弃用该客户关联，统一通过 `products.project_id -> projects.customer_id` 关联查询获取客户，避免数据不一致。 |
| `project_code` | text | 冗耐项目编码 | deprecated | 属于冗余字段，可直接通过 `project_id` 关联查询。 |
| `factory` | text | 生产工厂名称 | rename_later | 字符串类型且默认“宜宾”，应替换为 `factory_id` 关联 `manufacturing_factories`。 |
| `profile_code` | text | 默认型材编码 | deprecated | 型材默认代码以文本形式直存已废弃。主型材应通过 `product_materials` 表表达。如果后续新增 `product_materials.is_primary`，则 `is_primary = 1` 的物料为主型材；在未新增 `is_primary` 前，同一产品 active 状态下唯一一条 `product_materials` 记录视为主型材。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 产品ID | 无 | keep |
| `code` | text | 是 | 产品编码 | 无 | keep |
| `name` | text | 是 | 产品名称 | 无 | keep |
| `unit` | text | 是 | 单位 | `'PCS'` | keep |
| `process_route` | text | 否 | 工艺路线JSON | `'[]'` | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `project_id` | text | 否 | 项目ID | 无 | keep |
| `party_id` | text | 否 | 关联往来单位ID（已废弃） | 无 | deprecated |
| `factory_id` | text | 是 | 生产工厂ID | 无 | need_add |
| `profile_code` | text | 否 | 默认型材编码（已废弃） | 无 | deprecated |
| `created_at` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updated_at` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 重复的产品-型材关系 | `products.profile_code` 与 `product_materials` BOM 关系表均可以维护型材，逻辑冲突 | 废弃 `products.profile_code`，全部以 `product_materials` 中的BOM数据作为物料消耗的事实源。在未新增 `is_primary` 前，同一产品 active 状态下唯一一条 `product_materials` 记录视为主型材。 | 是，排产时无法确定以哪个字段为准去检查物料库存 |
| 工艺路线以JSON字符串形式直存 | `process_route` 直存工序ID数组（例如 `["1","2"]`），不利于进行工序维度的联合查询和排程 | V1 阶段保持JSON以便于快速开发，但在工单生成时必须把当前的工艺内容进行快照保存 | 是，否则会导致全局工艺更改时，进行中的工单工序错乱 |

---

### 6. materials

#### 1. 业务定位
`materials` 是型材 / 原材料 / 辅料主数据的唯一权威表。型材统一作为 material 维护，其 `type` 建议使用 `'profile'`，不再使用旧的 `parts` 零件表维护型材。型材代码一般可以是产品代码加 `"-YL"`。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 物料ID | keep | 主键。 |
| `code` | text | 物料编码 | keep | 唯一索引。 |
| `name` | text | 物料名称 | keep | 必填。 |
| `type` | text | 物料类型 | keep | 默认 `'raw'`。 |
| `unit` | text | 计量单位 | keep | 默认 `'pcs'`。 |
| `spec` | text | 规格 | keep | 默认空字符串。 |
| `notes` | text | 备注说明 | keep | 默认空字符串。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `created_at` | text | 创建时间 | keep | 标准蛇形命名，物理列一致。 |
| `updated_at` | text | 更新时间 | keep | 标准蛇形命名，物理列一致。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 物料主键ID | 无 | keep |
| `code` | text | 是 | 物料编码 | 无 | keep |
| `name` | text | 是 | 物料名称 | 无 | keep |
| `type` | text | 是 | 物料类型 | `'profile'` (profile / raw / accessory) | keep |
| `unit` | text | 是 | 单位 | `'pcs'` | keep |
| `spec` | text | 否 | 规格型号 | `''` | keep |
| `supplier_id` | text | 后续新增时选填 | 默认供应商ID | 无 | need_add |
| `material_category` | text | 后续新增时选填 | 物料类别 (例如: 6系铝材) | `''` | need_add |
| `default_lead_time` | integer | 后续新增时必填 | 默认采购天数 | `0` | need_add |
| `notes` | text | 否 | 备注 | `''` | keep |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `created_at` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updated_at` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 缺失供应商绑定及交期 | 目前型材没有绑定默认的供应商和采购提前期 | 新增 `supplier_id` 和 `default_lead_time` 字段，以支持供料到货计划的自动计算 | 是，缺此字段则到货计划的“预计到货时间”只能靠人工录入 |

---

### 7. product_materials

#### 1. 业务定位
`product_materials` 是产品与型材 / 原材料的 BOM（物料清单）关系表。当前阶段一个产品通常对应一个主型材，但结构上需要支持未来一个产品对应多个物料，是物料消耗计算的唯一事实来源。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 主键ID | keep | 主键。 |
| `product_id` | text | 产品ID | keep | 必填。 |
| `material_id` | text | 原材料物料ID | keep | 必填。 |
| `quantity` | integer | 消耗数量 | keep | 默认 1。 |
| `status` | text | 状态 | keep | 默认 `'active'`。 |
| `created_at` | text | 创建时间 | keep | 标准蛇形命名，物理列一致。 |
| `updated_at` | text | 更新时间 | keep | 标准蛇形命名，物理列一致。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 记录唯一ID | 无 | keep |
| `product_id` | text | 是 | 产品ID | 无 | keep |
| `material_id` | text | 是 | 物料ID | 无 | keep |
| `quantity` | integer | 是 | 单件产品消耗数量 | `1` | keep |
| `usage_unit` | text | 后续新增时选填 | 消耗单位 | `'pcs'` | need_add |
| `loss_rate` | real | 后续新增时必填 | 损耗率 | `0.0` | need_add |
| `is_primary` | integer | 后续新增时必填 | 是否为主型材 (0: 否, 1: 是) | `1` | need_add |
| `status` | text | 是 | 状态 | `'active'` (active / inactive) | keep |
| `remark` | text | 后续新增时选填 | 备注说明 | `''` | need_add |
| `created_at` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updated_at` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 型材的损耗率计算 | 领料时型材通常存在锯切等加工损耗，当前无字段记录损耗率 | 增加 `loss_rate` (如 0.05 代表 5% 损耗)，在计算生产备料计划时，计划备料数 = 工单数 * (1 + 损耗率) | 是，会影响物料计划预算的准确度 |

---

### 8. customer_demands

#### 1. 业务定位
`customer_demands` 是一次客户需求导入、一份客户计划、一个需求批次的主表。后续业务流程不再向 `customer_orders` 写入。该表只表示批次信息，不表达具体的产品行。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 需求主表ID | keep | 主键。 |
| `code` | text | 需求编码 | keep | 用于展示的导入批次单号。 |
| `customerId` | text | 关联客户ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `customerName` | text | 客户名称 | keep | 历史快照字段，用于保留需求导入时的客户/产品显示信息，不作为主数据唯一事实源。 |
| `sourceType` | text | 来源类型 | keep | 默认 `'manual'`。 |
| `sourceFileName` | text | 导入的文件名称 | keep | 默认空字符串。 |
| `demandVersion` | integer | 需求版本号 | keep | 默认 1，每次重复导入同一单号则递增。 |
| `status` | text | 需求状态 | keep | 默认 `'imported'`，需要与目标状态统一。 |
| `requestedDate` | text | 要求交付日期 | keep | 默认空字符串。 |
| `notes` | text | 备注说明 | keep | 默认空字符串。 |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 需求主表ID | 无 | keep |
| `code` | text | 是 | 需求编码 | 无 | keep |
| `customerId` | text | 是 | 关联客户ID | 无 | keep |
| `customerName` | text | 否 | 客户名称历史快照 | `''` | keep |
| `sourceType` | text | 是 | 需求来源 | `'manual'` (manual / excel_import) | keep |
| `sourceFileName` | text | 否 | 导入的文件名称 | `''` | keep |
| `demandVersion` | integer | 是 | 需求版本号 | `1` | keep |
| `status` | text | 是 | 需求状态 | `'imported'` | keep |
| `requestedDate` | text | 否 | 要求交付日期 | `''` | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| `customerOrders` 的历史数据兼容 | 目前库里存在 `customerOrders` 表且关联旧业务 | 停止向 `customerOrders` 表写入任何新数据，在迁移脚本中将旧数据整合到 `customer_demands` 表 | 是，为后续重构及功能废弃做准备 |

---

### 9. demand_lines

#### 1. 业务定位
`demand_lines` 是系统生产、排产、发货追踪的唯一明细源头。每一行代表了：某客户 + 某项目 + 某产品 + 某数量 + 某交期。发货时必须回写此表的已发/未发数量。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 明细行ID | keep | 主键。 |
| `demandId` | text | 关联需求主表ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `code` | text | 明细行编码 | keep | 唯一索引，格式如 CD-001-001。 |
| `customerId` | text | 客户ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `customerName` | text | 客户名称 | keep | 历史快照字段，用于保留需求导入时的客户/产品显示信息，不作为主数据唯一事实源。 |
| `projectCode` | text | 项目编码 | rename_later | 建议改为 `project_id` 强外键关联项目表，避免存文本编码。 |
| `productId` | text | 产品ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `productCode` | text | 产品编码 | keep | 历史快照字段，用于保留需求导入时的客户/产品显示信息，不作为主数据唯一事实源。 |
| `productName` | text | 产品名称 | keep | 历史快照字段，用于保留需求导入时的客户/产品显示信息，不作为主数据唯一事实源。 |
| `sourceType` | text | 来源类型 | keep | 默认 `'manual'`。 |
| `quantity` | integer | 需求数量 | keep | |
| `deliveredQuantity` | integer | 已发货数量 | rename_later | 改名为 `shipped_quantity` 以符合语义。 |
| `unshippedQuantity` | integer | 未发货数量 | rename_later | 改名为 `unshipped_quantity`，或建议直接通过计算得出。 |
| `status` | text | 明细行状态 | keep | 默认 `'imported'`，需要对齐规范。 |
| `dueDate` | text | 要求交期 | keep | |
| `notes` | text | 备注 | keep | |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 需求明细行ID | 无 | keep |
| `demandId` | text | 是 | 关联需求主表ID | 无 | keep |
| `code` | text | 是 | 明细行编码 | 无 | keep |
| `customerId` | text | 是 | 客户ID | 无 | keep |
| `customerName` | text | 否 | 客户名称快照 | `''` | keep |
| `project_id` | text | 是 | 关联项目ID | 无 | need_add |
| `productId` | text | 是 | 产品ID | 无 | keep |
| `productCode` | text | 否 | 产品编码快照 | `''` | keep |
| `productName` | text | 否 | 产品名称快照 | `''` | keep |
| `quantity` | integer | 是 | 销售下单数量 | 无 | keep |
| `required_quantity` | integer | 后续新增时必填 | 实际计算需求量 (可加备品系数) | `0` | need_add |
| `planned_quantity` | integer | 后续新增时必填 | 已排产数量 | `0` | need_add |
| `produced_quantity` | integer | 后续新增时必填 | 已报工合格数量 | `0` | need_add |
| `shipped_quantity` | integer | 是 | 已发货数量 | `0` | rename_later (由 `deliveredQuantity` 改名) |
| `cancelled_quantity` | integer | 后续新增时选填 | 已取消数量 | `0` | need_add |
| `status` | text | 是 | 状态 | `'imported'` | keep |
| `dueDate` | text | 是 | 交期 | 无 | keep |
| `priority` | text | 后续新增时必填 | 优先级 | `'medium'` (high/medium/low) | need_add |
| `source_line_no` | text | 后续新增时选填 | 导入的原始行号 | `''` | need_add |
| `notes` | text | 否 | 备注 | `''` | keep |
| `closed_at` | text | 后续新增时选填 | 关闭时间 | 无 | need_add |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 状态流转规则
* **导入后**：
  * `customer_demands.status = imported`
  * `demand_lines.status = imported`
* **确认后**：
  * `customer_demands.status = confirmed`
  * `demand_lines.status = confirmed`
* **排产后**：
  * `demand_lines.status = planned`
* **生产下发后**：
  * `demand_lines.status = in_production`
* **可发货后**：
  * `demand_lines.status = ready_to_ship`
* **部分发货后**：
  * `demand_lines.status = partially_shipped`
* **全部发货后**：
  * `demand_lines.status = shipped`
* **关闭后**：
  * `demand_lines.status = closed`
* **取消后**：
  * `demand_lines.status = cancelled`

> [!IMPORTANT]
> * 不允许导入时主表是 `imported`，但明细行直接 `confirmed`。
> * 前端如果展示的是需求行状态，就必须以 `demand_lines.status` 为准。

#### 5. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 未发货数量 `unshippedQuantity` 维护冲突 | 数据库中物理存了 `unshippedQuantity` 字段，且每次发货都需要手动更新 `deliveredQuantity` 和 `unshippedQuantity` | 废弃 `unshippedQuantity` 字段的物理存储，改为通过 SQL 动态计算 (quantity - shipped_quantity)，防止并发更新时数据不对齐 | 否，仅涉及计算优化 |
| 生产计划目前未强回写此明细行 | 排产和完工合格数没有更新回 `demand_lines` 的对应统计字段 | 当生产计划发布和工单完工时，应调用明细行服务，回写 `planned_quantity` 和 `produced_quantity` | 是，直接影响销售订单执行进度的跟踪统计 |

---

### 10. production_plans

#### 1. 业务定位
`production_plans` 是生产排产计划主表。V1 中生产计划与需求行的唯一可信关联关系为 `production_demand_links`。即使单个需求行生成单个生产计划，也必须写入 `production_demand_links`。生产计划可以来自一个或多个 `demand_lines` 的合并排产，后续业务逻辑不再把旧的 `customer_orders` 或 `order_lines` 作为计划的来源。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 计划ID | keep | 主键。 |
| `code` | text | 计划单号 | keep | 唯一。 |
| `title` | text | 计划标题 | keep | |
| `planDate` | text | 计划排程日期 | keep | |
| `orderLineId` | text | 关联行ID | deprecated | 字段语义混乱，历史上可能存旧订单行或需求行。V1 新逻辑不再依赖此字段，统一通过 `production_demand_links` 关联 `demand_lines`。 |
| `projectCode` | text | 关联项目编码 | keep | 生产计划生成时的历史快照字段，用于列表展示和历史追溯，不作为主数据唯一事实源。 |
| `productCode` | text | 关联产品编码 | keep | 生产计划生成时的历史快照字段，用于列表展示和历史追溯，不作为主数据唯一事实源。 |
| `materialCode` | text | 关联型材编码 | keep | 生产计划生成时的历史快照字段，用于列表展示和历史追溯，不作为主数据唯一事实源。 |
| `planPeriod` | text | 计划周期 | keep | 格式如 2026-05。 |
| `projectId` | text | 项目ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `customerId` | text | 客户ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `productId` | text | 产品ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `materialId` | text | 物料ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `planQty` | integer | 计划排产数量 | deprecated | 与 `plannedQuantity` 重复冗余。 |
| `plannedQuantity` | integer | 计划生产数量 | keep | 建议统一使用此字段。 |
| `dueDate` | text | 计划交付日期 | keep | |
| `priority` | text | 优先级 | keep | 默认 `'medium'`。 |
| `plannedStartAt` | text | 计划开始时间 | keep | |
| `plannedFinishAt` | text | 计划完成时间 | keep | |
| `materialReadyStatus` | text | 物料齐套状态 | keep | 默认 `'unknown'`。 |
| `riskLevel` | text | 风险级别 | keep | 默认 `'medium'`。 |
| `status` | text | 计划状态 | keep | 默认 `'draft'`，需要与目标状态统一。 |
| `createdBy` | text | 创建人 | keep | |
| `releasedAt` | text | 下发日期 | keep | |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 计划ID | 无 | keep |
| `code` | text | 是 | 计划编码 | 无 | keep |
| `title` | text | 是 | 计划标题 | 无 | keep |
| `planDate` | text | 是 | 计划日期 | 无 | keep |
| `orderLineId` | text | 否 | 关联行ID（已废弃） | 无 | deprecated |
| `projectId` | text | 否 | 项目ID | 无 | keep |
| `projectCode` | text | 否 | 项目编码快照 | `''` | keep |
| `customerId` | text | 否 | 客户ID | 无 | keep |
| `productId` | text | 是 | 产品ID | 无 | keep |
| `productCode` | text | 否 | 产品编码快照 | `''` | keep |
| `materialId` | text | 否 | 主消耗型材ID | 无 | keep |
| `materialCode` | text | 否 | 原材料编码快照 | `''` | keep |
| `factory_id` | text | 是 | 计划生产工厂ID | 无 | need_add |
| `plan_type` | text | 后续新增时必填 | 计划排产类型 | `'normal'` (normal / rework / stock) | need_add |
| `plannedQuantity` | integer | 是 | 计划排产数量 | `0` | keep |
| `dueDate` | text | 是 | 截止交期 | 无 | keep |
| `priority` | text | 是 | 优先级 | `'medium'` (high/medium/low) | keep |
| `plannedStartAt` | text | 是 | 计划开始时间 | 无 | keep |
| `plannedFinishAt` | text | 是 | 计划结束时间 | 无 | keep |
| `materialReadyStatus` | text | 是 | 物料准备评估 | `'unknown'` | keep |
| `riskLevel` | text | 是 | 计划风险级别 | `'medium'` (high/medium/low) | keep |
| `status` | text | 是 | 状态 | `'draft'` | keep |
| `createdBy` | text | 否 | 创建人 | `''` | keep |
| `releasedAt` | text | 否 | 发布时间 | 无 | keep |
| `locked_at` | text | 后续新增时选填 | 锁定时间 | 无 | need_add |
| `cancelled_at` | text | 后续新增时选填 | 取消时间 | 无 | need_add |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| `planQty` 与 `plannedQuantity` 重合 | 同时定义了这两个整型字段且写入相同的值 | 物理废弃 `planQty`，保留 `plannedQuantity`，防止开发统计接口时取错字段 | 否 |
| 多行合并排产的单一外键歧义 | 计划中保留了 `orderLineId` (单行外键)，但实际还存在 `production_demand_links` 表达多行关系 | 将单行外键 `orderLineId` 转化为非必填的并设为 `deprecated`，强制在 `production_demand_links` 中存储子明细。 | 是，关系到排产时的分配和工单生成逻辑 |

---

### 11. work_orders

#### 1. 业务定位
`work_orders` 是车间生产执行主单（派工单），工单必须由生产计划（或为了插单/补料的计划）生成。用于指导车间派工、扫码报工、物料领用及工序流转，但不完全等同于宏观生产计划。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 工单ID | keep | 主键。 |
| `code` | text | 工单单号 | keep | 唯一。 |
| `productionPlanId` | text | 关联生产计划ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `orderLineId` | text | 关联订单明细行ID | deprecated | 历史遗留字段，新逻辑不再依赖。 |
| `productId` | text | 产品ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `materialId` | text | 型材/物料ID | keep | 数据库物理列已通过 Drizzle 映射，TS 属性名暂不修改。 |
| `customerName` | text | 客户名称 | rename_later / deprecated | 冗余存储，应通过关联查询，或改名 `customer_id` |
| `projectName` | text | 项目名称 | rename_later / deprecated | 冗余存储 |
| `plannedQuantity` | integer | 计划生产数 | keep | |
| `reportedQuantity` | integer | 已报工总数 | keep | 包含合格/不良/废品 |
| `goodQuantity` | integer | 合格品数量 | keep | 报工合格数汇总 |
| `completedQuantity` | integer | 完工数 | need_review | 与 `goodQuantity` 关系不清，需明确是“最后工序合格完工数”还是“总完工数” |
| `defectQuantity` | integer | 不良品数 | keep | |
| `scrapQuantity` | integer | 报废品数 | keep | |
| `status` | text | 工单状态 | keep | |
| `plannedStartDate` | text | 计划开工日期 | keep | |
| `plannedFinishDate` | text | 计划完工日期 | keep | |
| `currentStepId` | text | 当前工序步骤ID | keep | 关联 `work_order_steps` |
| `notes` | text | 备注 | keep | |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |
| `completedAt` | text | 完工时间 | keep | |
| `closedAt` | text | 关闭时间 | keep | |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 工单主键 | 无 | keep |
| `code` | text | 是 | 工单单号 | 无 | keep |
| `productionPlanId` | text | 否 | 生产计划ID | 无 | keep |
| `orderLineId` | text | 否 | 关联订单明细行ID（已废弃） | 无 | deprecated |
| `productId` | text | 是 | 产品ID | 无 | keep |
| `materialId` | text | 否 | 主型材物料ID | 无 | keep |
| `factory_id` | text | 是 | 工厂ID | 无 | need_add |
| `plannedQuantity` | integer | 是 | 计划生产数 | `0` | keep |
| `reportedQuantity` | integer | 是 | 已报工总数 | `0` | keep |
| `goodQuantity` | integer | 是 | 合格品数 | `0` | keep |
| `completedQuantity` | integer | 是 | 完工入库数量 | `0` | keep |
| `defectQuantity` | integer | 是 | 拦截不良品数 | `0` | keep |
| `scrapQuantity` | integer | 是 | 报废品数 | `0` | keep |
| `process_route_snapshot` | text | 否 | 工艺路线快照 (防止在工单执行过程中全局产品工艺路线被修改) | `'[]'` | need_add |
| `status` | text | 是 | 状态 | `'created'` | keep |
| `plannedStartDate` | text | 否 | 计划开始时间 | `''` | keep |
| `plannedFinishDate` | text | 否 | 计划结束时间 | `''` | keep |
| `currentStepId` | text | 否 | 当前工位/工序 | 无 | keep |
| `notes` | text | 否 | 备注 | `''` | keep |
| `released_at` | text | 后续新增时选填 | 发布时间 | 无 | need_add |
| `started_at` | text | 后续新增时选填 | 实际开工时间 | 无 | need_add |
| `completedAt` | text | 否 | 实际完工时间 | 无 | keep |
| `closedAt` | text | 否 | 实际关闭时间 | 无 | keep |
| `cancelled_at` | text | 后续新增时选填 | 取消时间 | 无 | need_add |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| `completedQuantity` 与 `goodQuantity` 业务冲突 | 报工流程更新了 `goodQuantity` 等，但最后工序又回写了 `completedQuantity` | 明确：`goodQuantity` 是过程合格数的汇总累加；`completedQuantity` 是最后一道完工工序的产出合格数（即最终可入库的产成品数量）。需要重新校准报工更新逻辑。 | 是，影响良率和工单完成率指标计算 |
| 工单明细到需求明细的关联追溯 | 工单中已废弃单需求明细行 `orderLineId` 字段 | 工单追溯需求行统一走以下路径：`work_orders.productionPlanId -> production_plans.id -> production_demand_links.productionPlanId -> demand_lines.id`。 | 是，涉及车间报工对销售需求的追溯报表统计 |
| 缺乏工艺路线执行快照 | 直接引用 `products.process_route`，如果产品工艺路线在生产中途被修改，会导致已开工的工单步骤发生混乱 | 新增 `process_route_snapshot` 字段，工单生成时锁死当前工艺路线，后续执行以此快照为准 | 是，影响工艺的严谨性和历史回溯 |

---

### 12. inventory_balances

#### 1. 业务定位
`inventory_balances` 是当前库存余额结果表。这是一个实时汇总表，包含产成品、型材、辅料在物理仓库或库位上的可用、冻结等状态的数量额度。该表只能由 `InventoryLedgerService` 统一做计算写入，任何其他业务模块不得绕过流水直接更改此表。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 库存余额ID | keep | 主键 |
| `itemId` | text | 物料/产品ID | keep | 核心标识，可以为 `products.id` 或 `materials.id` |
| `itemCode` | text | 物料/产品编码 | keep | 当前库存查询缓存字段，由 InventoryLedgerService 统一维护，禁止业务模块直接写入。 |
| `itemName` | text | 物料/产品名称 | keep | 当前库存查询缓存字段，由 InventoryLedgerService 统一维护，禁止业务模块直接写入。 |
| `itemType` | text | 物品类型 | keep | `'product'` 或 `'material'` 等 |
| `projectId` | text | 项目ID | keep | 标识是否属于项目专用料，为空代表通用料 |
| `projectCode` | text | 项目编码 | keep | 当前库存查询缓存字段，由 InventoryLedgerService 统一维护，禁止业务模块直接写入。 |
| `customerId` | text | 客户ID | keep | 标识客户备料或寄存库存 |
| `customerName` | text | 客户名称 | keep | 当前库存查询缓存字段，由 InventoryLedgerService 统一维护，禁止业务模块直接写入。 |
| `warehouseId` | text | 仓库ID | keep | 外键 |
| `warehouseName` | text | 仓库名称 | keep | 当前库存查询缓存字段，由 InventoryLedgerService 统一维护，禁止业务模块直接写入。 |
| `locationId` | text | 库位ID | keep | 外键 |
| `locationCode` | text | 库位编码 | keep | 当前库存查询缓存字段，由 InventoryLedgerService 统一维护，禁止业务模块直接写入。 |
| `inventoryStatus` | text | 库存状态 | keep | 核心，需对齐状态枚举 |
| `quantity` | integer | 库存数量 | keep | 核心，必须大于等于0 |
| `unit` | text | 单位 | keep | |
| `sourceNo` | text | 最后一次变动源单号 | keep | 用于直观溯源 |
| `lastTransactionAt` | text | 最后变动时间 | keep | |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |
| `updatedAt` | text | 更新时间 | keep | 数据库物理列已通过 Drizzle 映射为 `updated_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 库存主键ID | 无 | keep |
| `itemId` | text | 是 | 产品ID / 物料ID | 无 | keep |
| `itemCode` | text | 否 | 物料编码缓存 | `''` | keep |
| `itemName` | text | 否 | 物料名称缓存 | `''` | keep |
| `itemType` | text | 是 | 物品类型 | `'material'` (material/product) | keep |
| `projectId` | text | 否 | 关联项目ID | 无 | keep |
| `projectCode` | text | 否 | 项目编码缓存 | `''` | keep |
| `customerId` | text | 否 | 关联客户ID | 无 | keep |
| `customerName` | text | 否 | 客户名称缓存 | `''` | keep |
| `warehouseId` | text | 是 | 仓库ID | 无 | keep |
| `warehouseName` | text | 否 | 仓库名称缓存 | `''` | keep |
| `locationId` | text | 否 | 库位ID | 无 | keep |
| `locationCode` | text | 否 | 库位编码缓存 | `''` | keep |
| `inventoryStatus` | text | 是 | 库存状态枚举 | `'available'` | keep |
| `quantity` | integer | 是 | 当前结存数量 | `0` | keep |
| `unit` | text | 是 | 计量单位 | `'pcs'` | keep |
| `sourceNo` | text | 否 | 最近一次影响变化的单据号 | `''` | keep |
| `lastTransactionAt` | text | 否 | 最近变化时间 | 无 | keep |
| `createdAt` | text | 是 | 创建时间 | 当前时间戳 | keep |
| `updatedAt` | text | 是 | 更新时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 混用的库存异常状态值 | 服务层代码和质检系统在冻结与报废时，写入了 `'frozen'`, `'held'`, `'scrap'`, `'scrapped'` 4种不同的库存状态字符串 | 将冻结统一为 `'held'`，报废统一为 `'scrapped'`。彻底消除 `'frozen'` 和 `'scrap'`，重构状态检索条件 | 是，会导致库存可用性判断（如排产时查备料）漏算被冻结或报废的库存 |

---

### 13. inventory_transactions

#### 1. 业务定位
`inventory_transactions` 是库存变动的唯一流水事实表（库存台账）。系统内任何引起库存物理或逻辑变化的动作（收料入库、出库领料、品质冻结、解冻、盘点调整、销售出库等），必须以事务性操作生成此流水，任何业务模块都禁止“只改余额不留痕迹”。

#### 2. 当前字段审计
| 字段 | 当前类型 | 当前含义 | 状态 | 备注 |
|---|---|---|---|---|
| `id` | text | 流水ID | keep | 主键 |
| `transactionNo` | text | 变动流水号 | keep | 唯一，以 ITX 为前缀的单号 |
| `itemId` | text | 物品ID | keep | 物料或产品ID |
| `itemCode` | text | 物品编码 | keep | 库存流水历史快照字段，用于审计追溯，不随主数据改名而重写。 |
| `itemName` | text | 物品名称 | keep | 库存流水历史快照字段，用于审计追溯，不随主数据改名而重写。 |
| `itemType` | text | 物品类型 | keep | `'product'` / `'material'` |
| `projectId` | text | 项目ID | keep | 允许为空 |
| `projectCode` | text | 项目编码 | keep | 库存流水历史快照字段，用于审计追溯，不随主数据改名而重写。 |
| `customerId` | text | 客户ID | keep | 允许为空 |
| `customerName` | text | 客户名称 | keep | 库存流水历史快照字段，用于审计追溯，不随主数据改名而重写。 |
| `warehouseId` | text | 仓库ID | keep | |
| `warehouseName` | text | 仓库名称 | keep | 库存流水历史快照字段，用于审计追溯，不随主数据改名而重写。 |
| `locationId` | text | 库位ID | keep | |
| `locationCode` | text | 库位编码 | keep | 库存流水历史快照字段，用于审计追溯，不随主数据改名而重写。 |
| `transactionType` | text | 变动交易类型 | keep | 收/发/调/冻/释，需要对齐规范 |
| `quantityChange` | integer | 变动数量 | keep | 可正可负（入库为正，出库为负） |
| `beforeQuantity` | integer | 变动前数量 | keep | 默认 0 |
| `afterQuantity` | integer | 变动后数量 | keep | 默认 0 |
| `fromStatus` | text | 变动前库存状态 | keep | 用于冻结 and 状态变更流水记录 |
| `toStatus` | text | 变动后库存状态 | keep | |
| `sourceType` | text | 源单据类型 | keep | 如 `'purchase'`, `'work_order'`, `'shipment'` |
| `sourceId` | text | 源单据ID | keep | 关联的具体源头记录ID |
| `sourceNo` | text | 源单据号 | keep | |
| `operatorId` | text | 操作员ID | keep | |
| `operatorName` | text | 操作员姓名 | keep | |
| `occurredAt` | text | 发生时间 | keep | |
| `remark` | text | 变动备注/原因说明 | keep | |
| `createdAt` | text | 创建时间 | keep | 数据库物理列已通过 Drizzle 映射为 `created_at`，TS 属性名暂不修改。 |

#### 3. V1 目标字段草案
| 字段 | 类型 | 是否必填 | 说明 | 默认值 / 枚举 | 状态 |
|---|---|---|---|---|---|
| `id` | text | 是 | 流水ID | 无 | keep |
| `transactionNo` | text | 是 | 流水编码 | 无 | keep |
| `itemId` | text | 是 | 产品ID / 物料ID | 无 | keep |
| `itemCode` | text | 否 | 物料编码快照 | `''` | keep |
| `itemName` | text | 否 | 物料名称快照 | `''` | keep |
| `itemType` | text | 是 | 物品类型 | `'material'` | keep |
| `projectId` | text | 否 | 关联项目ID | 无 | keep |
| `projectCode` | text | 否 | 项目编码快照 | `''` | keep |
| `customerId` | text | 否 | 关联客户ID | 无 | keep |
| `customerName` | text | 否 | 客户名称快照 | `''` | keep |
| `warehouseId` | text | 是 | 仓库ID | 无 | keep |
| `warehouseName` | text | 否 | 仓库名称快照 | `''` | keep |
| `locationId` | text | 否 | 库位ID | 无 | keep |
| `locationCode` | text | 否 | 库位编码快照 | `''` | keep |
| `transactionType` | text | 是 | 变动类型枚举 | 无 | keep |
| `quantityChange` | integer | 是 | 变动数量 (入库为正，出库为负) | 无 | keep |
| `beforeQuantity` | integer | 是 | 变动前结存量 | `0` | keep |
| `afterQuantity` | integer | 是 | 变动后结存量 | `0` | keep |
| `fromStatus` | text | 否 | 变动前状态 | `''` | keep |
| `toStatus` | text | 否 | 变动后状态 | `''` | keep |
| `sourceType` | text | 是 | 触发变动的源单据类别 | 无 | keep |
| `sourceId` | text | 是 | 触发变动的源单ID | 无 | keep |
| `sourceNo` | text | 是 | 触发变动的源单号 | `''` | keep |
| `operatorId` | text | 否 | 操作人员唯一ID | `''` | keep |
| `operatorName` | text | 是 | 操作人员名字 | 无 | keep |
| `occurredAt` | text | 是 | 记账时间 | 当前时间戳 | keep |
| `remark` | text | 否 | 调整/变动原因说明 | `''` | keep |
| `createdAt` | text | 是 | 写入时间 | 当前时间戳 | keep |

#### 4. 需要人工确认的问题
| 问题 | 当前情况 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| 变动类型和源类型的歧义冲突 | 业务代码中直接写入的 `transactionType` 与统一规范有部分偏差，例如手动调整写入了 `adjust` 或 `adjustment` | 强制统一 `transactionType` 枚举并写入校验函数，使库存账目可溯源、易统计 | 是，影响物料出入库汇总报表与审计日志 |
| 在途与质检入库状态流水 | 目前没有记录采购在途或质检等待的流水 | 后续采购和到货环节增加 `'in_transit'` (在途) 和 `'inspection'` (待检) 的流水支持，以便采购部门跟踪状态 | 否 |

---

## 字段冲突清单

| 表 | 当前字段 | 问题 | 建议处理 |
|---|---|---|---|
| `customer_demands`, `demand_lines`, `work_orders`, `inventory_balances`, `inventory_transactions` | `customerName` / `customer_name` | 冗余存储客户名称字符串。如果客户在主数据中更名，会导致各表数据不同步。 | 业务单据表、库存流水表和结存表均作为历史快照或查询缓存保留，标记为 `keep`，不作为主数据唯一事实源。 |
| `products`, `demand_lines`, `production_plans`, `work_orders`, `inventory_balances`, `inventory_transactions` | `projectCode` / `projectName` | 冗余存储项目的 Code 和 Name 文本。 | 作为历史快照或查询缓存保留，标记为 `keep`。 |
| `projects`, `products` | `party_id` | 指向旧的往来单位表（`parties`），但现在客户已独立至 `customers` 表，容易导致关联混乱。 | 统一通过项目和客户关联（`products.project_id -> projects.customer_id`），弃用产品上的 `party_id`（改名/废弃）。 |
| `products` | `factory` | 生产工厂存为文本 `'宜宾'`，而系统已存在工厂主数据表 `manufacturing_factories`。 | 废弃文本 `factory` 字段，增加 `factory_id` 外键关联工厂主数据。 |
| `products` | `profile_code` | 型材默认代码以文本形式直存已废弃。 | 主型材关联统一走 `product_materials` BOM 表（以 `is_primary = 1` 标识主型材），避免产品表上双重维护。 |
| `production_plans` | `planQty` & `plannedQuantity` | 同一张表里同时存在这两个含义一模一样的整型字段，在代码中同时被写入相同的值。 | 废弃 `planQty` 字段，代码中统一使用 `plannedQuantity`。 |
| `work_orders` | `goodQuantity` & `completedQuantity` | 这两个字段在报工和结单时语义模糊。 | 明确定义：`goodQuantity` 代表各工序过程报工合格数的累加值；`completedQuantity` 代表最终末工序入库合格数。建议将 `completedQuantity` 改名为 `finished_quantity`。 |

---

## 待补充字段清单

| 表 | 建议新增字段 | 原因 | 优先级 |
|---|---|---|---|
| `products` | `factory_id` | 取代硬编码的工厂文本，使产品能指派给不同的实体工厂。 | `lock_before_v1` |
| `demand_lines` | `project_id` | 销售明细行必须强外键关联到项目，而非冗余 projectCode 文本。 | `lock_before_v1` |
| `production_plans` | `factory_id` | 计划指派的具体加工工厂。 | `lock_before_v1` |
| `work_orders` | `factory_id` | 车间派工的具体执行厂区。 | `lock_before_v1` |
| `work_orders` | `process_route_snapshot` | 锁死开工时的工艺路线快照，防止全局产品工艺修改波及执行中工单。 | `lock_before_v1` |
| `customers` | `customer_code` | 客户需要有简短易读的唯一编码（如 CUST-001）用于前台搜索和导入匹配。 | `v1_later` |
| `profile_suppliers` | `supplier_code` | 原材料采购和入库需要通过易读的供应商编码识别，而非仅靠长 UUID。 | `v1_later` |
| `products` | `drawing_no` | CNC加工件交付给客户前，必须核对具体的图纸版本号。 | `v1_later` |
| `materials` | `supplier_id` | 原材料默认供应商，以便做采购建议和到货跟踪。 | `v1_later` |
| `materials` | `default_lead_time` | 原材料默认采购提前期，供MRP齐套性算期使用。 | `v1_later` |
| `product_materials` | `loss_rate` | 备料计算时必须包含型材锯切及打样的定额损耗。 | `v1_later` |
| `product_materials` | `is_primary` | 用于标识多物料BOM中，哪一个是核心主型材。 | `v1_later` |
| `demand_lines` | `planned_quantity` | 回写已排产的生产计划总数，用以监控订单排产进度。 | `v1_later` |
| `demand_lines` | `produced_quantity` | 过程报工合格产出数累计，用以监控车间完工情况。 | `v1_later` |
| `work_orders` | `released_at` | 工单发布给生产的时间戳。 | `v1_later` |
| `work_orders` | `started_at` | 车间开工时间戳。 | `v1_later` |
| `customers` | `客户多地址表` | 支持单个客户多个不同送货及发货地址（子表）。 | `v2` |
| `product_materials` | `BOM复杂单位换算` | 支持BOM消耗单位与库存计量单位的复杂换算逻辑。 | `v2` |
| `materials` | `多供应商优先级` | 支持单个物料配置多个备选供应商及采购配额/优先级。 | `v2` |
| `materials` | `高级MRP参数` | 如安全库存量、最小采购包装量、再订货点等参数。 | `v2` |

---

## 待统一状态清单

| 表 | 当前状态 | 建议状态 | 使用位置 | 是否需要迁移 |
|---|---|---|---|---|
| `customer_demands` | `imported`, `confirmed`, `planned`, `delivered`, `partially_delivered`, `cancelled`, `closed` | `imported`, `confirmed`, `planned`, `in_production`, `ready_to_ship`, `partially_shipped`, `shipped`, `closed`, `cancelled` | `order-flow.service.ts` & `shipment.service.ts` | 是 (需把已发货状态名 delivered / partially_delivered 转换为 shipped / partially_shipped) |
| `demand_lines` | `confirmed`, `planned`, `in_production`, `delivered`, `partially_delivered`, `closed` | `imported`, `confirmed`, `planned`, `in_production`, `ready_to_ship`, `partially_shipped`, `shipped`, `closed`, `cancelled` | `order-flow.service.ts` & `shipment.service.ts` | 是 (对齐同上) |
| `inventory_balances` | `available`, `held`, `frozen`, `scrap`, `scrapped` | `available`, `held`, `scrapped`, `inspection`, `in_transit` | `inventory-ledger.service.ts` | 是 (将存量中的 frozen 批量更新为 held，将 scrap 更新为 scrapped) |
| `inventory_transactions` | 写入交易类型混用了 `adjust`, `ship`, `inventory_hold` 等非标字符 | `receipt`, `issue`, `production_receipt`, `production_issue`, `inventory_freeze`, `inventory_unfreeze`, `scrap`, `adjustment`, `stocktake_adjustment`, `shipment` | `inventory-ledger.service.ts` & `shipment.service.ts` | 是 (迁移旧流水中的 transactionType 字符串以符合新枚举规则) |

---

## 必须人工确认的问题

| 问题 | 涉及表 | 推荐方案 | 是否影响后续开发 |
|---|---|---|---|
| **1. 废弃 parties 表带来的历史数据转换** | `projects`, `products`, `customers` | V1 全面启用 `customers` 作为唯一客户主数据，将原先在 `parties` 中具有 `'customer'` 类型的记录清洗并迁移到 `customers` 表，删除 `parties` 的逻辑依赖。 | 是，涉及系统能否平滑升级。 |
| **2. 工单完工数量 completedQuantity 的精确业务定义** | `work_orders` | 明确定义：`goodQuantity` 为各工序扫码合格的中间件累计，`completedQuantity` 仅指末道工序报工产出的最终合格品数量。该数量是触发产成品入库的唯一基准。 | 是，直接影响车间产出统计和报工准确度。 |
| **3. 计划与需求行的唯一可信关联** | `production_plans` | V1 中生产计划与需求行的唯一可信关联关系为 `production_demand_links`。即使单个需求行生成单个生产计划，也必须写入 `production_demand_links`。废弃单计划行关联外键。 | 是，直接决定排产业务服务的核心处理逻辑。 |
| **4. 生产工厂字段 factory 从文本向 ID 外键重构** | `products`, `production_plans`, `work_orders` | 将上述表中所有的 `factory` 文本列逐步改造为 `factory_id`，强制在 `manufacturing_factories` 中配置并读取，清除 `'宜宾'` 等硬编码默认值。 | 是，决定了多厂区（宜宾、重庆、外协）业务拆分后的权限与数据隔离。 |
| **5. 运行中工单的工艺路线防波机制** | `work_orders` | 引入 `process_route_snapshot` 字段。工单在“发布（released）”状态时，克隆并固化产品当前的 `process_route` JSON，后续执行完全依赖快照。 | 是，防止中途修改工艺导致的工序执行及报工错误。 |
| **6. 库存结存及流水表快照与缓存字段** | `inventory_balances`, `inventory_transactions` | 快照与缓存字段状态标记为 `keep`，作为历史查询及追溯依据，禁止随意废弃。但需在 `InventoryLedgerService` 中建立一致的写入维护规范。 | 是，影响数据完整度。 |
| **7. 异常状态值 (frozen vs held) 命名标准** | `inventory_balances`, `inventory_transactions` | 品质异常或库内锁定一律统称为“冻结（held）”，彻底废弃代码中的 `'frozen'` 字符串。不良报废状态一律统称为“报废（scrapped）”，废弃 `'scrap'` 字符串。 | 是，影响 MRP 计算时的可用库存（available = 结存 - held - scrapped）。 |
| **8. 发货状态命名与生命周期的转换** | `customer_demands`, `demand_lines` | 统一将 `'delivered'`（已交付）更名为 `'shipped'`（已发货），因为货物出库并不代表客户已签收妥投，销售发货统一叫 shipment。 | 是，影响订单列表的状态查询与过滤。 |
| **9. 生产领料及型材消耗的追溯设计** | `inventory_transactions` | 工单报工时除了产成品入库外，需增加原材料（型材）扣减流水，流水类型为 `production_issue`，并记录 `sourceId` 为当前工单ID，实现投料与产出双向追溯。 | 是，关系到能否生成车间物料超耗/节约分析报表。 |
| **10. 客户编码 customer_code 缺失下的订单匹配规则** | `customers` | Excel导入订单时，目前使用 `customer_name` 去模糊匹配客户。容易因字眼不一致匹配失败。必须尽快补齐 `customer_code`，并强制以编码作为导入匹配的唯一键。 | 是，否则会带来大量重复导入或匹配错客户的手工纠错成本。 |

---

## 后续必须补充的 V1 操作表

当前文档只覆盖 13 张骨架表，还不能作为完整锁库依据。

必须补充以下表的字段草案：

- `inventory_holds`
- `warehouses`
- `locations`
- `receipts`
- `receipt_items`
- `issues`
- `issue_items`
- `quality_issues`
- `issue_actions`
- `shipments`
- `shipment_items`
- `work_order_steps`
- `operation_reports`

在这些表字段草案完成前，不得宣布 Dday V1 数据库结构最终锁定。
