# cf-taskflow-hono (MES Lite)

一个基于 **Cloudflare Workers + D1 + Hono + React + Refine** 的轻量级、以订单交付为核心的制造执行系统（MES Lite）。

本项目原为个人工作流系统，现已全面重构升级为**涵盖供应链闭环管理的轻型 ERP/MES**。整个逻辑以“订单交付”为主线，支持单据环节下推，并提供强大的全局流转追溯（上查/下查）功能。

## 核心业务闭环

系统通过一套标准化的实体流转打通了生产制造与交付流程：

1. **订单管理 (Order Management)**: 支持导入客户销售订单，触发生产需求，跟踪整体交付进度。
2. **计划管理 (Plan Management)**: 将订单下推转换为具体的生产排程计划，进行能力分配。
3. **生产管理 (Work Order / Production)**: 生产计划下达成为具体的车间生产工单（Work Order）。支持生产报工（Report Progress），报工完成后系统自动扣减待生产数量并执行成品入库。
4. **库存管理 (Inventory Management)**: 实时监控原材料、半成品和成品的库存（可用、冻结、报废）。提供手动物料入库入口（Receive Material）。
5. **发货管理 (Delivery Management)**: 订单下推生成发货计划，结合质量与库存状况进行发货放行控制，确认发货后扣减可用库存。
6. **质量管理 (Quality Management)**: 记录全流程的质量异常，支持联动冻结风险库存，阻断不良品发货。
7. **全链路追溯 (Traceability)**: 以订单或产品为锚点，双向追溯从物料入库、生产计划、工单执行到发货出库的完整历史和关联单据。

## 技术栈 (Tech Stack)

* **Edge Compute**: Cloudflare Workers
* **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
* **Backend API**: Hono + Zod (Validation)
* **Frontend**: React + Vite + Refine + Ant Design
* **Language**: TypeScript

---

## 1. 安装依赖

```bash
npm install
```

## 2. 创建 D1 数据库

```bash
npm run db:create
```

Cloudflare 会输出类似配置：

```json
{
  "binding": "DB",
  "database_name": "taskflow",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

把 `database_id` 填入 `wrangler.jsonc` 中对应的 `d1_databases` 配置块里。注意：代码里只读取 `c.env.DB`，所以 binding 必须叫 `DB`。

## 3. 初始化数据库表

本地开发环境：

```bash
npm run db:migrate:local
```

线上远程环境：

```bash
npm run db:migrate:remote
```

部署后如果页面能打开，但数据无法读取或保存，请优先检查远程迁移是否已执行，可以使用以下命令查看已执行的迁移文件：

```bash
npm run db:migrations:remote
```

## 4. 设置访问令牌 (Auth Token)

本地开发：

```bash
cp .dev.vars.example .dev.vars
```

然后把 `.dev.vars` 里的 `APP_TOKEN` 改成你自己的专属密钥。

线上环境：

```bash
npx wrangler secret put APP_TOKEN
```

## 5. 本地开发运行

本项目包含了 Backend API 和 Frontend SPA。本地开发时需要同时启动这两个服务：

1. **启动后端 Hono 服务** (默认监听 `http://localhost:8787`):
   ```bash
   npm run dev
   ```

2. **启动前端 Admin 界面** (默认监听 `http://localhost:5173`):
   打开一个新的终端窗口：
   ```bash
   npm run admin:dev
   ```

访问 `http://localhost:5173`。在页面右上角的配置面板中填入你的 `APP_TOKEN` 并保存。

## 6. 构建与部署到 Cloudflare

部署包含两个步骤：先构建前端静态文件，然后再推送整个 Worker。

```bash
npm run build
npm run deploy
```

发布成功后，访问：
```text
https://你的-worker.workers.dev
```

## 7. 线上状态监控

部署后可以访问探针地址检查数据库绑定及连通状态：
```text
https://你的-worker.workers.dev/healthz
```

正常时应看到：
```json
{
  "ok": true,
  "database": {
    "binding": true,
    "connected": true,
    "schema_ready": true,
    "order_count": 0
  }
}
```

## API 权限校验

对于外部直接调用 API，所有 `/api/*` 请求都需要带上认证头：

```text
X-App-Token: 你的APP_TOKEN
```
或者
```text
Authorization: Bearer 你的APP_TOKEN
```

如果未携带有效的 Token，系统将返回 `401 Unauthorized`。
