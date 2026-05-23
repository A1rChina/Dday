# Dday V1 数据库结构锁定文档

从即日起，Dday 项目数据库结构正式进入 **锁定 (Locked)** 阶段。

---

## 1. 数据库锁定原则

1. **结构只读**: 禁止直接或间改动 `src/db/schema.ts`、`migrations/*` 目录中的 schema 结构、字段名、类型和状态默认值。
2. **严限新功能**: 严禁新增任何未经人工审核的数据库表，也不得在现有表中任意增加或删除字段。
3. **适配开发**: 后续所有功能的扩展、表单交互及接口设计，必须在现有 V1 数据库表结构和字段映射下进行。
4. **废弃表禁写**: 标记为 deprecated 的表在代码中属于只读/待清退状态，不允许在任何新开发的逻辑中写入数据。
5. **变更流程化**: 如确有重大业务需要修改数据库结构，必须遵循规范的《数据库变更申请》并人工确认，才可执行迁移。

---

## 2. Dday V1 允许使用的表清单

系统当前所有新业务逻辑只允许访问以下 43 张业务表。

### 2.1 系统权限 (5张)

*   **`users`**
    *   *业务含义*: 系统用户表。用于系统登录、身份标识与基础权限分配。
    *   *关键字段*: `id` (主键), `username` (唯一编码), `role` (角色), `status` (状态)
    *   *状态枚举*: `status` ('active', 'inactive'), `role` ('admin', 'planner', 'operator', 'viewer')
*   **`roles`**
    *   *业务含义*: 角色定义表。定义系统不同的角色身份（如管理员、查看者、操作员等）。
    *   *关键字段*: `id` (主键), `code` (唯一编码), `name` (角色名称)
    *   *状态枚举*: 无
*   **`permissions`**
    *   *业务含义*: 权限点定义表。细粒度控制前端路由与后端 API 访问。
    *   *关键字段*: `id` (主键), `code` (唯一编码), `module` (所属模块), `action` (动作)
    *   *状态枚举*: 无
*   **`role_permissions`**
    *   *业务含义*: 角色权限关联表。维护角色与具体权限点的多对多关系。
    *   *关键字段*: `role_code` (角色编码), `permission_code` (权限编码) -> 联合主键
    *   *状态枚举*: 无
*   **`operation_logs`**
    *   *业务含义*: 操作日志表。记录关键单据的创建、修改和删除等行为，用于审计。
    *   *关键字段*: `id` (主键), `actor` (操作人), `entity_type` (实体类型), `entity_id` (实体ID)
    *   *状态枚举*: 无

### 2.2 主数据 (9张)

*   **`customers`**
    *   *业务含义*: 客户资料表。保存客户的名称、简称、联系人、电话、送货地址等基础信息。
    *   *关键字段*: `customer_id` (主键), `customer_name` (客户名称)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`profile_suppliers`**
    *   *业务含义*: 供应商资料表。保存型材厂/供应商的资料及默认采购交期。
    *   *关键字段*: `supplier_id` (主键), `supplier_name` (供应商名称)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`manufacturing_factories`**
    *   *业务含义*: 生产工厂主数据表。用于多工厂或多车间的基础资料管理。
    *   *关键字段*: `factory_id` (主键), `factory_name` (工厂名称), `factory_code` (工厂编码)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`projects`**
    *   *业务含义*: 项目资料表。保存内部或外部的项目编码、名称和关联项目负责人。
    *   *关键字段*: `id` (主键), `code` (唯一项目编码), `name` (项目名称)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`products`**
    *   *业务含义*: 产品主数据表。包括产品编码、名称、图号、工艺路线等，是订单和排产的核心基础。
    *   *关键字段*: `id` (主键), `code` (产品编码), `project_id` (项目ID), `factory` (生产工厂)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`materials`**
    *   *业务含义*: 物料资料表。包括原材料、辅助材料或零部件的基础数据。
    *   *关键字段*: `id` (主键), `code` (物料编码), `type` (物料类型)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`product_materials`**
    *   *业务含义*: 产品BOM关联表。记录生产某个产品所需的原材料及配比用量。
    *   *关键字段*: `id` (主键), `product_id` (产品ID), `material_id` (物料ID)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`processes`**
    *   *业务含义*: 工序表。定义生产工艺路线中的标准化步骤（如：切割、折弯、组装等）。
    *   *关键字段*: `id` (主键), `code` (工序编码), `name` (工序名称)
    *   *状态枚举*: `is_active` (1 - 启用, 0 - 禁用)
*   **`machines`**
    *   *业务含义*: 设备表。维护车间中具体加工设备的设备编号、名称、所属工序等。
    *   *关键字段*: `id` (主键), `code` (设备编码), `process_id` (工序ID)
    *   *状态枚举*: `status` ('available', 'busy', 'maintenance', 'disabled'), `is_active` (1 - 启用, 0 - 禁用)

### 2.3 需求 / 订单 (4张)

*   **`customer_demands`**
    *   *业务含义*: 客户需求主表。代表原始需求池，存放客户订单编码、交期及版本。
    *   *关键字段*: `id` (主键), `code` (需求号), `customer_id` (客户ID)
    *   *状态枚举*: `status` ('imported', 'confirmed', 'planned', 'in_production', 'partially_delivered', 'delivered', 'closed', 'cancelled')
*   **`demand_lines`**
    *   *业务含义*: 需求明细行表。具体每一条需求的产品、数量、已交付数及状态。
    *   *关键字段*: `id` (主键), `demand_id` (需求主表ID), `product_id` (产品ID)
    *   *状态枚举*: `status` ('confirmed', 'planned', 'in_production', 'partially_delivered', 'delivered', 'closed', 'cancelled')
*   **`demand_plan_versions`**
    *   *业务含义*: 需求版本控制表。保存导入需求文件时的原始负载和版本更新历史。
    *   *关键字段*: `id` (主键), `order_id` (原始订单号/需求号)
    *   *状态枚举*: 无
*   **`production_demand_links`**
    *   *业务含义*: 生产计划-需求关联表。用于多对多连接排产计划与订单需求来源。
    *   *关键字段*: `id` (主键), `production_plan_id` (计划ID), `demand_line_id` (需求明细ID)
    *   *状态枚举*: 无

### 2.4 生产执行 (7张)

*   **`production_plans`**
    *   *业务含义*: 生产计划主表。计划排产的产品、计划产量、交期和齐套性状态。
    *   *关键字段*: `id` (主键), `code` (计划编码), `product_id` (产品ID)
    *   *状态枚举*: `status` ('draft', 'released', 'pending', 'running', 'completed', 'cancelled', 'abnormal_closed')
*   **`production_plan_items`**
    *   *业务含义*: 生产计划明细表。记录某笔排产下的具体数量和分配设备。
    *   *关键字段*: `id` (主键), `plan_id` (计划ID), `product_id` (产品ID)
    *   *状态枚举*: `status` ('draft', 'planned', 'completed')
*   **`work_orders`**
    *   *业务含义*: 生产工单表。车间派产任务，跟踪计划量、报工量、良品量、报废量等。
    *   *关键字段*: `id` (主键), `code` (工单号), `production_plan_id` (计划ID), `product_id` (产品ID)
    *   *状态枚举*: `status` ('created', 'printed', 'released', 'running', 'paused', 'completed', 'closed', 'cancelled')
*   **`work_order_steps`**
    *   *业务含义*: 工单工序步骤表。将工单拆解为具体的工序流，跟踪工序完成及不良品数。
    *   *关键字段*: `id` (主键), `work_order_id` (工单ID), `process_id` (工序ID)
    *   *状态枚举*: `status` ('pending', 'running', 'completed', 'blocked', 'skipped')
*   **`process_cards`**
    *   *业务含义*: 周转工艺卡表。伴随实物在现场流转，包含图纸号和数量，用于扫码报工。
    *   *关键字段*: `id` (主键), `card_code` (卡号), `production_order_id` (工单ID)
    *   *状态枚举*: `status` ('created', 'active', 'completed', 'voided')
*   **`operation_reports`**
    *   *业务含义*: 工序报工记录表。精细化记录每次扫码或手动填报的良品数、不良数、设备和报工人。
    *   *关键字段*: `id` (主键), `report_no` (报工号), `card_id` (卡ID)
    *   *状态枚举*: `report_type` ('scan', 'manual')
*   **`wip_transactions`**
    *   *业务含义*: 在制品流水表。记录生产过程中在制品各工序间的移交、变动Delta值。
    *   *关键字段*: `id` (主键), `card_id` (卡ID), `report_id` (报工记录ID)
    *   *状态枚举*: 无

### 2.5 仓储 / 库存 (12张)

*   **`warehouses`**
    *   *业务含义*: 仓库表。配置不同的实物仓库（如主料库、成品库、不良品库等）。
    *   *关键字段*: `id` (主键), `code` (仓库唯一编码), `name` (仓库名称)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`locations`**
    *   *业务含义*: 库位表。仓库内部的具体货架或库位编码。
    *   *关键字段*: `id` (主键), `code` (库位唯一编码), `warehouse_code` (所属仓库)
    *   *状态枚举*: `status` ('active', 'inactive')
*   **`inventory_balances`**
    *   *业务含义*: 库存余额表。核心账目，描述“某项目-某产品/物料-某库位-某状态”下的当前数量。
    *   *关键字段*: `id` (主键), `item_id` (物料/产品ID), `warehouse_id` (仓库ID), `location_id` (库位ID)
    *   *状态枚举*: `inventory_status` ('available', 'frozen', 'held', 'scrap', 'scrapped')
*   **`inventory_transactions`**
    *   *业务含义*: 库存收发流水表。记录每一次库存动作（入库、出库、冻结、盘点），用于溯源审计。
    *   *关键字段*: `id` (主键), `transaction_no` (流水号), `item_id` (物料/产品ID)
    *   *状态枚举*: `transaction_type` ('receipt', 'issue', 'adjustment', 'production_good_in', 'production_scrap', 'inventory_freeze', 'inventory_unfreeze')
*   **`inventory_holds`**
    *   *业务含义*: 库存冻结锁定表。登记冻结数量、冻结原因（如品质异常、争议），执行锁定控制。
    *   *关键字段*: `id` (主键), `hold_no` (冻结单号), `item_id` (物料ID)
    *   *状态枚举*: `status` ('pending', 'held', 'released', 'scrapped')
*   **`receipts`**
    *   *业务含义*: 入库单主表。记录到货入库事务。
    *   *关键字段*: `id` (主键), `code` (入库单号)
    *   *状态枚举*: `status` ('draft', 'confirmed', 'cancelled')
*   **`receipt_items`**
    *   *业务含义*: 入库单明细表。入库物料明细、数量、批次。
    *   *关键字段*: `id` (主键), `receipt_id` (入库单ID), `item_id` (物料ID)
    *   *状态枚举*: 无
*   **`issues`**
    *   *业务含义*: 出库单主表。记录物料领用或出库事务。
    *   *关键字段*: `id` (主键), `code` (出库单号)
    *   *状态枚举*: `status` ('draft', 'confirmed', 'cancelled')
*   **`issue_items`**
    *   *业务含义*: 出库单明细表。出库物料明细、数量、批次。
    *   *关键字段*: `id` (主键), `issue_id` (出库单ID), `item_id` (物料ID)
    *   *状态枚举*: 无
*   **`stocktakes`**
    *   *业务含义*: 盘点单主表。仓库定期盘点的任务单。
    *   *关键字段*: `id` (主键), `code` (盘点单号), `warehouse_code` (盘点仓库)
    *   *状态枚举*: `status` ('draft', 'completed', 'cancelled')
*   **`stocktake_items`**
    *   *业务含义*: 盘点单明细表。实盘账面数量、实盘数量和差异量。
    *   *关键字段*: `id` (主键), `stocktake_id` (盘点单ID), `item_id` (物料ID)
    *   *状态枚举*: 无
*   **`material_delivery_plans`**
    *   *业务含义*: 型材到货计划表。保存供应商物料计划交付时间、跟踪单号和到货核销记录。
    *   *关键字段*: `id` (主键), `code` (计划号), `material_id` (物料ID)
    *   *状态枚举*: `status` ('pending', 'shipped', 'received', 'delayed')

### 2.6 质量控制 (2张)

*   **`quality_issues`**
    *   *业务含义*: 质量问题主数据表。记录来料/生产过程产生的品质异常及数量，挂载冻结ID。
    *   *关键字段*: `id` (主键), `code` (异常单号), `inventory_lock_id` (库存冻结记录ID)
    *   *状态枚举*: `status` ('open', 'confirmed', 'processing', 'frozen', 'resolved', 'closed')
*   **`issue_actions`**
    *   *业务含义*: 质量处理跟进表。记录质量问题的处理步骤和动作历史。
    *   *关键字段*: `id` (主键), `issue_id` (质量问题ID)
    *   *状态枚举*: 无

### 2.7 交付与发货 (4张)

*   **`delivery_plans`**
    *   *业务含义*: 发货计划主表。面向客户交付的成品发货排期。
    *   *关键字段*: `id` (主键), `code` (计划号)
    *   *状态枚举*: `status` ('draft', 'released', 'shipped')
*   **`delivery_plan_items`**
    *   *业务含义*: 发货计划明细表。发货批次、数量、产品明细。
    *   *关键字段*: `id` (主键), `delivery_plan_id` (计划ID), `product_id` (产品ID)
    *   *状态枚举*: 无
*   **`shipments`**
    *   *业务含义*: 发货单主表。记录正式成品发货出库凭证，扣减成品可用库存。
    *   *关键字段*: `id` (主键), `code` (发货单号), `demand_id` (关联需求)
    *   *状态枚举*: `status` ('created', 'confirmed')
*   **`shipment_items`**
    *   *业务含义*: 发货单明细表。发货产品明细与实发数量。
    *   *关键字段*: `id` (主键), `shipment_id` (发货单ID), `product_id` (产品ID)
    *   *状态枚举*: 无

---

## 3. 废弃表清单

以下 11 张表属于废弃表，在 V1 版本中**禁止写入任何新数据**。它们将在后续重构和迁移任务中被完全清除。

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

### 3.1 其他未分类/待处理表
在 `schema.ts` 中还发现以下 4 张表未包含在 V1 和废弃清单中，它们目前的备注状态为 `need_review`，后续迁移中需评审：
*   `project_parts` (项目型材配置表): 旧版项目和型材关联，后续需向产品 BOM `product_materials` 合并。
*   `work_resources` (生产资源分配表): 暂未用于主要流程，工单和设备关联多在 `work_order_steps` 确定。
*   `supply_chain_events` (供应链追溯事件表): 用于全链路看板，后续评估是否保留。
*   `attachments` (通用业务附件表): 存放文件附件元数据，可作为技术公共表暂时保留。

---

## 4. Codex 禁止修改数据库规则

为了保证 V1 版本的稳定性，对于 Codex 智能代理或协作模型：
*   **严禁修改**: `src/db/schema.ts`、任意 migrations 里的 SQL、Drizzle config 文件及 wrangler D1 binding。
*   **允许修改**: 业务路由 logic (`routes/*`)、逻辑服务层 (`services/*`)、前端 UI 组件 (`ui/*`) 及查询语句的拼接与字段读取。
*   **如何修改**: 任何结构变更必须按照 `docs/CODEX_DB_CHANGE_POLICY.md` 约定的《数据库变更申请》模板填写申请，等待人工评审与操作。
