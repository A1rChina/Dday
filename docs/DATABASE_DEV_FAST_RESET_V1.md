# Dday 开发期数据库快速重建与 V1 Schema 对齐说明

## 背景

Dday 当前仍处于开发期，数据库数据可以丢弃或重建。本次已按 `docs/DATABASE_LOCK_V1.md` 对齐 V1 schema，并采用开发期快速清理策略。

## 已执行策略

- `src/db/schema.ts` 已按 V1 主线表重建。
- deprecated 表已从 schema 中移除。
- deprecated 字段依赖已从业务代码中清理。
- 旧 migration 已清理。
- `migrations/0001_v1_baseline.sql` 已作为新的 V1 baseline migration。
- `demand_lines.status` 默认值已调整为 `imported`。

## 后续规则

- 后续 Codex 不得自行修改数据库结构。
- 如需修改表或字段，必须先更新 `docs/DATABASE_LOCK_V1.md` 或提交数据库变更申请。
- 不得恢复 deprecated 表作为事实源。
- 不得新增 `DATABASE_LOCK_V1.md` 之外的新表或新字段。
- 库存变化必须继续通过 `InventoryLedgerService`。

## 本地开发建议

开发环境可直接清空或重建本地 D1，然后重新应用：

```bash
npm run db:migrate:local
```

远程 D1 只有在确认没有必须保留的数据时，才允许采用重建或清空后重新应用 baseline 的方式。
