# Dday 数据库变更申请：lock_before_v1 字段补充

> 注意：本文件为早期保守迁移方案，仅保留用于历史追溯。由于 Dday 项目当前仍处于开发期，数据库可以快速重建，后续不再采用本文件中“只补 3 个字段、nullable、分阶段回填”的方案。实际执行以 `docs/DATABASE_LOCK_V1.md` 和本次 V1 Schema 对齐任务为准。

## 1. 变更摘要

本次数据库变更申请只涉及 3 个字段：

| 表 | TS 字段 | 数据库物理列 | 类型 | 是否必填 | 默认值 | 优先级 |
|---|---|---|---|---|---|---|
| `receipt_items` | `itemType` | `item_type` | text | 是 | 待确认 | lock_before_v1 |
| `issue_items` | `itemType` | `item_type` | text | 是 | 待确认 | lock_before_v1 |
| `shipment_items` | `demandLineId` | `demand_line_id` | text | 是 | 待确认 | lock_before_v1 |

注意：

- 这里的“是否必填”表示目标业务规则必填。
- SQLite / D1 实际 migration 是否能直接加 NOT NULL，需要单独评估。
- 如果已有历史数据，不能直接新增 NOT NULL 且无默认值字段。

## 2. 变更原因

### 2.1 receipt_items.itemType

当前 `receipt_items.itemId` 可能指向：

- `products.id`
- `materials.id`

但表中没有字段说明当前行到底是产品还是物料。

风险：

- 入库落账时服务层无法稳定判断联表对象。
- 成品入库和原材料入库容易混淆。
- 库存流水中的 `itemType` 无法可靠生成。

目标：

- 新增 `itemType`，物理列为 `item_type`。
- 枚举建议：`product` / `material`。

### 2.2 issue_items.itemType

当前 `issue_items.itemId` 也可能指向：

- `products.id`
- `materials.id`

但出库明细没有字段说明当前出库对象类型。

风险：

- 生产领料、销售出库、报废出库无法稳定区分物料和产品。
- 库存扣减时可能扣错库存对象。
- 后续库存流水无法形成稳定审计链。

目标：

- 新增 `itemType`，物理列为 `item_type`。
- 枚举建议：`product` / `material`。

### 2.3 shipment_items.demandLineId

当前发货明细 `shipment_items` 中缺少需求行关联。

风险：

- 发货后无法精确回写 `demand_lines` 的已发数量。
- 多产品 / 多需求行合并发货时，无法判断每一行发货对应哪一条需求。
- 只能依赖 `shipments.demandLineId` 单头字段，无法支持明细级发货。

目标：

- 新增 `demandLineId`，物理列为 `demand_line_id`。
- 用于发货明细精确回写需求行。
- 启用 `shipment_items` 明细后，以 `shipment_items.demandLineId` 为唯一可信来源。

## 3. 涉及表和字段定义

### 3.1 receipt_items

建议新增字段：

| TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议枚举 | 说明 |
|---|---|---|---|---|---|
| `itemType` | `item_type` | text | 是 | `product`, `material` | 区分入库明细对象类型 |

### 3.2 issue_items

建议新增字段：

| TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议枚举 | 说明 |
|---|---|---|---|---|---|
| `itemType` | `item_type` | text | 是 | `product`, `material` | 区分出库明细对象类型 |

### 3.3 shipment_items

建议新增字段：

| TS 字段 | 数据库物理列 | 类型 | 目标是否必填 | 建议关联 | 说明 |
|---|---|---|---|---|---|
| `demandLineId` | `demand_line_id` | text | 是 | `demand_lines.id` | 发货明细对应需求行 |

## 4. migration 风险评估

D1 / SQLite 对已有表新增 NOT NULL 字段存在限制。

如果表中已有历史数据，不能直接执行：

- `ALTER TABLE receipt_items ADD COLUMN item_type TEXT NOT NULL`
- `ALTER TABLE issue_items ADD COLUMN item_type TEXT NOT NULL`
- `ALTER TABLE shipment_items ADD COLUMN demand_line_id TEXT NOT NULL`

风险：

- 旧数据没有字段值。
- migration 可能失败。
- 即使成功，也可能导致旧接口写入失败。

因此建议分阶段处理。

## 5. 推荐 migration 方案

必须采用“两阶段策略”。

### 阶段一：兼容新增字段

先新增可为空字段：

| 表 | 字段 | SQL 建议 |
|---|---|---|
| `receipt_items` | `item_type` | `ALTER TABLE receipt_items ADD COLUMN item_type TEXT;` |
| `issue_items` | `item_type` | `ALTER TABLE issue_items ADD COLUMN item_type TEXT;` |
| `shipment_items` | `demand_line_id` | `ALTER TABLE shipment_items ADD COLUMN demand_line_id TEXT;` |

说明：

- 第一阶段不直接加 NOT NULL。
- 第一阶段不直接加 CHECK。
- 第一阶段不直接加外键。
- 先保证旧数据和旧接口不被 migration 破坏。

### 阶段二：服务层强校验

在 service 层新增写入校验：

- 新增入库明细时，`itemType` 必须是 `product` 或 `material`。
- 新增出库明细时，`itemType` 必须是 `product` 或 `material`。
- 新增发货明细时，`demandLineId` 必须存在。
- 发货确认时，必须根据 `shipment_items.demandLineId` 回写 `demand_lines`。

说明：

- 业务必填先通过 service 层保证。
- 等历史数据清洗完成后，再考虑数据库级 NOT NULL / CHECK。

### 阶段三：历史数据回填

#### receipt_items.item_type 回填建议

根据 `itemId` 判断：

1. 如果 `itemId` 存在于 `products.id`，则 `item_type = 'product'`。
2. 如果 `itemId` 存在于 `materials.id`，则 `item_type = 'material'`。
3. 如果两边都不存在，标记为 `need_review`。
4. 如果两边都存在，也标记为 `need_review`，需要人工确认。

#### issue_items.item_type 回填建议

同上。

#### shipment_items.demand_line_id 回填建议

优先级：

1. 如果所属 `shipments.demandLineId` 不为空，则回填到 `shipment_items.demand_line_id`。
2. 如果 `shipments.demandLineId` 为空，但 `shipments.demandId + productId` 能唯一匹配 `demand_lines`，则可回填。
3. 如果无法唯一匹配，则标记为 `need_review`。
4. 不允许猜测回填。

### 阶段四：数据库强约束候选

历史数据清洗完成后，后续可以提交第二次数据库变更申请，考虑：

- `receipt_items.item_type` 增加 NOT NULL。
- `issue_items.item_type` 增加 NOT NULL。
- `shipment_items.demand_line_id` 增加 NOT NULL。
- 增加 CHECK 约束。
- 增加索引。

本次申请不直接做这些强约束。

## 6. 建议索引

本次只提出建议，不允许直接修改数据库。

建议后续考虑：

| 表 | 索引字段 | 原因 |
|---|---|---|
| `receipt_items` | `item_type`, `item_id` | 入库落账时快速定位物品类型 |
| `issue_items` | `item_type`, `item_id` | 出库扣减时快速定位物品类型 |
| `shipment_items` | `demand_line_id` | 发货回写需求行 |
| `shipment_items` | `shipment_id` | 查询发货单明细 |

说明：

- 如果当前已有 `shipment_id` 索引，不要重复新增。
- 索引是否创建，后续单独申请。

## 7. 影响范围

### 后端服务

可能影响：

- 入库服务
- 出库服务
- 发货服务
- 库存台账服务
- 质量异常服务
- 生产报工服务

### 前端页面

可能影响：

- 入库单页面
- 出库单页面
- 发货单页面
- 订单 / 需求追踪页面
- 库存查询页面

### 数据联动

必须影响：

- 入库确认生成库存流水
- 出库确认生成库存流水
- 发货确认扣减库存
- 发货确认回写 `demand_lines`

## 8. 不修改会造成的问题

如果不新增这 3 个字段，会导致：

1. 入库明细无法区分产品和物料。
2. 出库明细无法区分产品和物料。
3. 库存流水 `itemType` 来源不稳定。
4. 发货明细无法精确回写需求行。
5. 多需求行合并发货时无法追溯。
6. 系统继续依赖旧订单字段或单头字段，违背 `DATABASE_LOCK_V1.md`。
7. 后续 Codex 可能继续绕路新增其他表或字段。

## 9. 是否可用现有字段替代

| 字段 | 是否可用现有字段替代 | 结论 |
|---|---|---|
| `receipt_items.itemType` | 否 | `itemId` 无法表达对象类型 |
| `issue_items.itemType` | 否 | `itemId` 无法表达对象类型 |
| `shipment_items.demandLineId` | 短期可用 `shipments.demandLineId` 兼容 | 启用明细后不能替代 |

## 10. 回滚方案

如果 migration 已执行但业务验证失败：

1. 不立即删除新增字段。
2. 暂停新字段写入。
3. 服务层回退到旧逻辑。
4. 保留新增字段为空，不影响旧数据读取。
5. 等问题修正后重新启用。
6. 只有确认完全不使用时，再提交单独删除字段申请。

说明：

- SQLite/D1 删除字段风险较高。
- 不建议用删除字段作为第一回滚手段。

## 11. 验证方案

后续真正修改数据库后需要验证以下项目。

### 11.1 schema 验证

- `src/db/schema.ts` 中应新增 3 个字段映射。
- TS 字段名使用驼峰。
- 数据库物理列使用蛇形。

### 11.2 migration 验证

- migration 可在本地 D1 执行。
- migration 可在远程 D1 执行。
- 旧数据不会丢失。
- 旧接口不会因 NOT NULL 失败。

### 11.3 业务验证

入库：

- 新增入库明细必须写入 `itemType`。
- 入库确认后库存流水能正确写入 `itemType`。

出库：

- 新增出库明细必须写入 `itemType`。
- 出库确认后库存流水能正确写入 `itemType`。

发货：

- 新增发货明细必须写入 `demandLineId`。
- 发货确认后能回写对应 `demand_lines`。
- 多条发货明细时，每条明细回写自己的需求行。

## 12. 本次申请结论

建议批准该数据库变更，但实际执行时必须分阶段进行：

1. 先新增 nullable 字段。
2. 再修改 service 层写入规则。
3. 再做历史数据回填。
4. 最后再考虑 NOT NULL / CHECK / 索引。

本次申请不允许直接执行 schema 或 migration 修改。
