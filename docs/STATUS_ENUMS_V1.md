# Dday V1 状态枚举定义文档

本文档定义并统一了 Dday V1 中核心业务对象的状态枚举。这些状态不仅在数据库中体现，也指导前后端交互与业务流程流转。

## 1. 核心状态枚举列表

### customer_demands.status (客户需求状态)
- **业务含义**: 客户需求单主表的生命周期状态。
- **值清单**:
  - `imported`: 已导入。通过导入或手动创建的初始状态。
  - `confirmed`: 已确认。需求已确立，待排产。
  - `planned`: 已计划。已生成对应的生产计划。
  - `in_production`: 生产中。已被释放到工单，开始进入生产阶段。
  - `partially_delivered`: 部分发货。明细项部分发货。
  - `delivered`: 已交付。全部数量发货完毕。
  - `closed`: 已关闭。手工关闭或已完成的最终态。
  - `cancelled`: 已取消。需求作废。

### demand_lines.status (需求明细状态)
- **业务含义**: 需求明细行（产品维度）的生命周期状态。
- **值清单**:
  - `confirmed`: 已确认。明细初始状态。
  - `planned`: 已计划。已关联生产计划。
  - `in_production`: 生产中。已生成生产工单并投产。
  - `partially_delivered`: 部分发货。
  - `delivered`: 已交付。
  - `closed`: 已关闭。
  - `cancelled`: 已取消。

### production_plans.status (生产计划状态)
- **业务含义**: 生产计划的审批和执行跟踪状态。
- **值清单**:
  - `draft`: 草稿。计划生成后的初始状态。
  - `released`: 已发布。已确认发布，生成对应生产工单（在此之后转为 pending / running）。
  - `pending`: 待生产。工单生成但尚未报工。
  - `running`: 生产中。工单已有报工记录。
  - `completed`: 已完成。工单完成数量达到计划数量。
  - `cancelled`: 已取消。计划作废。
  - `abnormal_closed`: 异常关闭。未生产足额但被强制关闭。

### work_orders.status (生产工单状态)
- **业务含义**: 生产车间工单执行状态。
- **值清单**:
  - `created`: 已创建。工单已生成。
  - `printed`: 已打印。派工单已打印，下发车间。
  - `released`: 已释放。工单可开始报工。
  - `running`: 执行中。已开始报工。
  - `paused`: 已暂停。生产过程中因故挂起。
  - `completed`: 已完成。良品数达到计划数。
  - `closed`: 已关闭。工单结案。
  - `cancelled`: 已取消。工单撤销。

### operation_reports.report_type (工序报工类型)
- **业务含义**: 标识报工单来源，用于区分数据入口与控制逻辑。
- **值清单**:
  - `scan`: 扫码报工。操作工通过扫工艺路线码或周转卡条码录入。
  - `manual`: 手动报工。计划员或主管在系统后台补报（必须录入 `manual_reason` 手动报工原因）。

### inventory_balances.inventory_status (库存余额状态)
- **业务含义**: 标识实物库存的可用性与质量控制属性。
- **值清单**:
  - `available`: 可用。可用于生产出库或发货。
  - `frozen`: 冻结。因异常锁定的实物库存，不可被领用/发货。
  - `held`: 质检冻结。因质量异常单登记而被系统自动冻结的库存。
  - `scrap`: 待报废。判定为不合格品，等待最终财务/物理报废。
  - `scrapped`: 已报废。完成物理报废处理后的归档库存状态。

### inventory_transactions.transaction_type (库存变动流水类型)
- **业务含义**: 标识引发库存数量变化的具体业务场景。
- **值清单**:
  - `receipt`: 仓储入库。
  - `issue`: 仓储出库。
  - `production_good_in`: 生产入库。工单报工良品入库。
  - `production_scrap`: 生产报废。生产过程中产生的不良/报废。
  - `adjustment`: 库存调整。手动盘点或系统纠错带来的调整。
  - `inventory_freeze`: 库存冻结。可用转冻结。
  - `inventory_unfreeze`: 库存解冻。冻结转可用。
  - `scrap`: 冻结报废。冻结库存物理报废。

### inventory_holds.status (库存冻结记录状态)
- **业务含义**: 质量或风险冻结单本身的流转状态。
- **值清单**:
  - `pending`: 待处理。系统 schema 默认值。
  - `held`: 已冻结。冻结成功生效中。
  - `released`: 已释放/解冻。已完成异常处理并重新释放为可用库存。
  - `scrapped`: 已报废。冻结库存已执行报废处置。

### quality_issues.status (质量问题状态)
- **业务含义**: 质量异常单的闭环流转状态。
- **值清单**:
  - `open`: 待处理。异常单登记后的初始状态。
  - `confirmed`: 已确认。质检员已确认异常属实。
  - `processing`: 处理中。方案制定或执行中。
  - `frozen`: 已冻结。相关涉及库存已完成同步冻结。
  - `resolved`: 已解决。处理方案已执行完成。
  - `closed`: 已关闭。质量异常已归档闭环。

### shipments.status (发货单状态)
- **业务含义**: 交付发货单的状态。
- **值清单**:
  - `created`: 已创建。草稿发货单。
  - `confirmed`: 已确认。发货确认并已扣减实物库存。

---

## 待统一状态

由于系统从演进中整理而来，目前在旧的代码库和 TS 类型定义中仍存在一些未统一的命名风格和重复定义，后续开发中应进行统一。

| 表 / 位置 | 当前状态值 | 建议状态值 | 使用位置 | 说明 |
|---|---|---|---|---|
| `inventory_transactions` | `receipt`, `issue`, `adjustment`, `production_good_in`, `production_scrap`, `inventory_freeze`, `inventory_unfreeze` | 将 JS 定义的 `movement_type` 转换成该数据库字段值 | `src/types.ts` (定义了 legacy `InventoryMovement.movement_type`) | 后端 TS 类型中 `adjust` / `finish` / `freeze` 与数据库的 `adjustment` / `production_good_in` / `inventory_freeze` 不统一，需统一以数据库为准。 |
| `inventory_balances` / `inventory_holds` | `scrap`, `scrapped` 并存 | 统一归并为 `frozen` -> `scrap` -> `scrapped` 链路 | `inventory-ledger.service.ts` | 报废状态命名在不同表中有的是 `scrap`（表示状态）有的是 `scrapped`（表示动作结果），建议在 V2 重构中进行标准化命名。 |
| `customer_demands` / `demand_lines` | 默认状态不一致（`imported` 与 `confirmed`） | 统一初始状态为 `confirmed` 或 `imported` | `src/db/schema.ts` | customer_demands 默认值是 'imported'，而 demand_lines 默认值是 'confirmed'。 |
| `types.ts` `FreezeStatus` | `open` \| `confirmed` \| `processing` \| `released` \| `scrapped` \| `returned` \| `closed` | 与 `inventory_holds.status` 及 `quality_issues.status` 保持命名一致 | `src/types.ts` (定义了 legacy `FreezeStatus`) | 包含了 quality_issues 和 inventory_holds 的混合状态，应当拆分为对应的业务类型。 |
