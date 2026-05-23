# Dday ERP/MES Lite

Dday 是一个运行在 Cloudflare Workers 上的轻量级 ERP/MES 系统。项目围绕“订单交付闭环”构建，覆盖基础资料、客户订单、生产计划、工单执行、报工、仓储库存、质量异常、发货交付和供应链追溯。

后端使用 Hono + Cloudflare D1 + Drizzle ORM，前端使用 React + Vite + Refine + Ant Design。部署后，Cloudflare Worker 同时提供 API 和后台管理页面。

## 核心能力

- 订单管理：维护客户需求、订单行、交付状态和生产关联。
- 生产计划：从订单生成生产计划，跟踪计划数量、风险、齐套和状态。
- 工单执行：管理工单、工序、报工、良品、不良和报废数量。
- 仓储管理：支持库存总览、库存明细、库存流水、关联单据、入库、出库、盘点、冻结和调整。
- 质量管理：记录质量异常，联动库存冻结、解冻、报废和处理动作。
- 交付管理：维护发货计划、出货记录和订单关闭。
- 基础资料：维护客户、供应商、项目、产品、型材、工厂、工序、设备等数据。
- 权限管理：提供用户、角色、权限点和基础 RBAC 支持。
- 追溯分析：通过库存流水、来源单据、订单、计划、工单、质量和发货记录串联业务链路。

## 技术栈

- 运行环境：Cloudflare Workers
- 数据库：Cloudflare D1 SQLite
- ORM：Drizzle ORM
- 后端框架：Hono
- 请求校验：Zod
- 前端框架：React + Vite
- 管理后台：Refine + Ant Design + Ant Design Pro Components
- 语言：TypeScript

## 目录说明

详细文件说明见：

- [项目文件结构说明](docs/PROJECT_STRUCTURE.md)
- [数据库表结构说明](docs/DATABASE_SCHEMA.md)

关键目录：

- `src/index.ts`：Worker 入口，注册中间件、API 路由和静态页面。
- `src/routes`：API 路由层。
- `src/services`：业务逻辑层。
- `src/schemas`：Zod 请求和查询参数校验。
- `src/db`：D1/Drizzle 数据库 schema 和客户端。
- `src/admin`：后台管理前端。
- `migrations`：D1 数据库迁移 SQL。
- `docs`：项目结构和数据库说明文档。

## 数据库结构锁定

Dday V1 数据库结构已锁定。

唯一权威文档：

- `docs/DATABASE_LOCK_V1.md`

数据库修改禁令：

- `docs/CODEX_DB_CHANGE_POLICY.md`
- `docs/DATABASE_DEV_FAST_RESET_V1.md`

历史草案：

- `docs/DATABASE_CORE_FIELDS_V1_DRAFT.md`
- `docs/DATABASE_OPERATION_FIELDS_V1_DRAFT.md`

后续开发规则：

- 不允许为同一业务对象重复建表。
- 不允许 Codex 自行修改数据库结构。
- 所有库存变化必须通过 `InventoryLedgerService`。
- 客户需求统一使用 `customer_demands + demand_lines`。
- 生产计划与需求行统一通过 `production_demand_links` 关联。
- 入库统一使用 `receipts + receipt_items`。
- 出库统一使用 `issues + issue_items`。
- 质量异常统一使用 `quality_issues + inventory_holds + issue_actions`。
- 发货统一使用 `shipments + shipment_items`。
- 报工统一使用 `work_order_steps + operation_reports`。

开发期数据库已采用单一 V1 baseline migration：`migrations/0001_v1_baseline.sql`。旧的分段 migration 已清理，deprecated 表不再作为 V1 schema 的一部分。


## 本地准备

安装依赖：

```bash
npm install
```

复制本地环境变量：

```bash
copy .dev.vars.example .dev.vars
```

然后修改 `.dev.vars` 中的 `APP_TOKEN`。该文件包含本地密钥，不应提交到 Git。

## 数据库

创建 D1 数据库：

```bash
npm run db:create
```

将 Cloudflare 返回的 `database_id` 写入 `wrangler.jsonc` 中的 D1 配置，binding 必须为 `DB`。

执行本地迁移：

```bash
npm run db:migrate:local
```

执行远程迁移：

```bash
npm run db:migrate:remote
```

查看远程迁移状态：

```bash
npm run db:migrations:remote
```

## 本地开发

启动 Worker API 和静态资源服务：

```bash
npm run dev
```

默认地址：

```text
http://localhost:8787
```

如需单独启动 Vite 前端开发服务：

```bash
npm run admin:dev
```

默认地址：

```text
http://localhost:5173
```

## 构建与部署

类型检查并构建前端：

```bash
npm run build
```

部署到 Cloudflare：

```bash
npm run deploy
```

当前项目已部署到：

```text
https://cf-taskflow-hono.3rr.workers.dev
```

## 健康检查

访问：

```text
/healthz
```

正常返回示例：

```json
{
  "ok": true,
  "service": "cf-taskflow-hono",
  "database": {
    "binding": true,
    "connected": true,
    "schema_ready": true
  }
}
```

## API 认证

除登录相关接口外，`/api/*` 请求需要带认证信息。

请求头：

```text
x-app-token: <APP_TOKEN>
x-app-role: admin
```

或：

```text
Authorization: Bearer <APP_TOKEN>
```

## GitHub 同步建议

推荐提交内容：

- `src`
- `migrations`
- `docs`
- `README.md`
- `package.json`
- `package-lock.json`
- `wrangler.jsonc`
- `vite.config.ts`
- `tsconfig.json`
- `.dev.vars.example`

不应提交：

- `.dev.vars`
- `node_modules`
- `.wrangler`
- `dist`
- 日志文件

## 常用命令

```bash
npm run typecheck
npm run build
npm run dev
npm run deploy
npm run db:migrate:local
npm run db:migrate:remote
```
