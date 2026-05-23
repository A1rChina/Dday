# 项目文件结构说明

本文档用于帮助开发者、维护者和 AI 助手快速理解 Dday 项目的代码组织方式。

Dday 是一个 Cloudflare Workers + D1 + Hono + React 的 ERP/MES Lite 项目。后端提供 API，前端提供后台管理界面，最终由同一个 Worker 对外服务。

## 根目录文件

- `package.json`：项目依赖和 npm 脚本定义。
- `package-lock.json`：依赖版本锁定文件。
- `wrangler.jsonc`：Cloudflare Workers 配置，包含 Worker 名称、D1 绑定、静态资源绑定和环境变量。
- `vite.config.ts`：前端 Vite 构建配置。
- `tsconfig.json`：TypeScript 编译配置。
- `index.html`：Vite 前端入口 HTML。
- `.dev.vars.example`：本地环境变量示例。
- `.gitignore`：Git 忽略规则，排除密钥、依赖、构建产物和本地状态文件。
- `README.md`：项目介绍、运行、构建、部署和协作说明。
- `seed-real-data.sql`：初始化或演示数据脚本。
- `note.md`：开发过程中的业务说明和临时记录。
- `docs`：项目说明文档目录。
- `migrations`：数据库迁移 SQL。
- `src`：项目主要源码。

## `src/index.ts`

Cloudflare Worker 主入口。

主要职责：

- 创建 Hono 应用。
- 注册日志中间件。
- 注册认证和 RBAC 中间件。
- 注册所有 `/api/*` 路由。
- 提供 `/healthz` 健康检查。
- 提供 `/scan`、`/print` 等页面入口。
- 为后台管理 SPA 提供静态资源和 fallback。

## `src/routes`

API 路由层。每个文件负责一个业务模块的 HTTP 接口，将请求转交给 service 层。

主要文件：

- `auth.routes.ts`：登录和认证相关接口。
- `users.routes.ts`：用户管理。
- `roles.routes.ts`：角色管理。
- `permissions.routes.ts`：权限点管理。
- `customers.routes.ts`：客户资料。
- `profile-suppliers.routes.ts`：供应商资料。
- `manufacturing-factories.routes.ts`：生产工厂资料。
- `parts.routes.ts`：型材/部件资料。
- `project-parts.routes.ts`：项目型材配置。
- `projects.routes.ts`：项目资料。
- `products.routes.ts`：产品资料。
- `orders.routes.ts`：订单和需求池。
- `production-plans.routes.ts`：生产计划。
- `work-orders.routes.ts`：生产工单。
- `reporting.routes.ts`：报工执行。
- `reports.routes.ts`：报表接口。
- `inventory.routes.ts`：库存动作，例如调整、冻结、解冻。
- `inventory-resource.routes.ts`：库存余额、库存流水、库存锁定查询。
- `warehouse.routes.ts`：仓库、库位、入库单、出库单、盘点单。
- `warehouse-receipts.routes.ts`：到货入库相关接口。
- `receipts.routes.ts`：物料收货相关接口。
- `quality-issues.routes.ts`：质量异常处理。
- `freezes.routes.ts`：冻结记录相关接口。
- `delivery-plans.routes.ts`：发货计划。
- `material-delivery-plans.routes.ts`：型材到货计划。
- `shipments.routes.ts`：发货记录。
- `scan.routes.ts`：PDA/扫码接口。
- `print.routes.ts`：打印页面接口。
- `supply-chain.routes.ts`：供应链跨模块查询。

## `src/services`

业务逻辑层。service 负责数据库读写、业务规则、状态流转和跨表操作。

主要文件：

- `inventory-ledger.service.ts`：库存台账核心服务。维护库存余额、库存流水、入库、出库、调整、冻结、解冻、盘点差异、筛选、排序和汇总统计。
- `warehouse.service.ts`：仓储单据服务。负责仓库、库位、入库单、出库单、盘点单的创建和列表查询。
- `order-flow.service.ts`：订单流服务。负责客户订单、需求、收货、计划下推和订单关闭等流程。
- `production-execution.service.ts`：生产执行服务。负责工单、工序、报工、资源和生产状态。
- `reporting.service.ts`：报工和工艺卡相关服务。
- `material-delivery.service.ts`：型材到货计划和仓库收货服务。
- `shipment.service.ts`：发货和出货关闭服务。
- `supply-chain.service.ts`：供应链看板和跨模块聚合查询。
- `resource-api.service.ts`：基础资料和通用资源 CRUD 服务。
- `mes.service.ts`：旧版或共享 MES 业务逻辑，仍被部分流程复用。

## `src/schemas`

Zod 校验层。用于校验请求体、查询参数和业务输入。

- `inventory-ledger.ts`：库存查询参数。
- `warehouse.ts`：仓库、库位、入库、出库、盘点参数。
- `order-flow.ts`：订单、收货、计划、发货、质量等流程参数。
- `resource.ts`：基础资料和工单资源参数。
- `production-execution.ts`：生产执行参数。
- `reporting.ts`：报工参数。
- `material-delivery.ts`：型材到货参数。
- `shipments.ts`：发货参数。
- `supply-chain.ts`：供应链查询参数。
- `mes.ts`：MES 共享参数。

## `src/db`

数据库层。

- `schema.ts`：Drizzle 表结构定义，是理解数据库模型的核心文件。
- `client.ts`：创建 D1 数据库客户端。

## `src/middleware`

中间件。

- `auth.ts`：校验 API token 和认证状态。
- `rbac.ts`：解析请求角色、操作人，并提供权限校验能力。

## `src/admin`

后台管理前端。

- `main.tsx`：React 入口，初始化 Refine、Ant Design 和数据源。
- `AdminApp.tsx`：后台整体布局、左侧菜单和页面切换。
- `resourceDataProvider.ts`：Refine 数据源适配器，将列表、分页、筛选、排序、增删改映射到后端 API。
- `authProvider.ts`：前端认证逻辑。
- `api.ts`：前端 API 辅助方法。
- `styles.css`：后台全局样式。
- `entity-drawer.css`：抽屉表单样式。

## `src/admin/ui`

后台页面组件。

- `InventoryResource.tsx`：库存管理工作台。包含高级筛选、库存总览、库存明细、库存流水、关联单据、详情抽屉、导出和保存查询方案。
- `InventoryHoldResource.tsx`：库存冻结记录。
- `ReceiptResource.tsx`：入库管理。
- `IssueResource.tsx`：出库管理。
- `StocktakeResource.tsx`：库存盘点。
- `WarehouseConfigResource.tsx`：仓库和库位设置。
- `OrderResource.tsx`：订单和需求池。
- `PlanResource.tsx`：生产计划。
- `WorkOrderResource.tsx`：工单管理。
- `ReportingResource.tsx`：报工执行。
- `QualityResource.tsx`：质量异常。
- `DeliveryResource.tsx`：到货和交付。
- `ProductResource.tsx`：产品和项目型材资料。
- `UserResource.tsx`：用户管理。
- `RoleResource.tsx`：角色管理。
- `PermissionResource.tsx`：权限点管理。
- `Login.tsx`：登录页面。

## `src/admin/ui/components`

后台通用组件。

- `AppPage`：统一页面容器。
- `AppPageHeader`：统一页面标题区。
- `AppProTable`：统一 ProTable 封装。
- `AppProForm`：统一 ProForm 封装。
- `AppDrawerForm`：抽屉表单。
- `AppModalForm`：弹窗表单。
- `AppSearchForm`：搜索表单。
- `AppToolbar`：工具栏。
- `AppTableActions`：表格操作按钮。
- `AppStatusTag`：状态标签。
- `EnterprisePageLayout.tsx`：更偏企业系统风格的布局组件。

## `src/ui`

服务端渲染的小页面。

- `scan-page.ts`：PDA/扫码页面 HTML。
- `print-work-order.ts`：工单打印页面 HTML。

## `src/utils`

通用工具函数。

- `date.ts`：日期标准化、当前时间。
- `id.ts`：ID 生成。
- `http.ts`：统一成功/失败响应。
- `week.ts`：ISO 周工具。
- `warehouse.ts`：根据产品规则推断仓库。
- `delimited.ts`：分隔文本解析。
- `hash.ts`：哈希工具。

## `migrations`

D1 数据库迁移文件。按编号顺序执行，记录了从初始化到订单、生产、仓储、库存、质量等模块的表结构演进。

常用命令：

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## 运行和部署

- 本地 Worker：`npm run dev`
- 前端开发：`npm run admin:dev`
- 类型检查和构建：`npm run build`
- 部署 Cloudflare：`npm run deploy`
