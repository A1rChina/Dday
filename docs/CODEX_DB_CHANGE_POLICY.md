# Codex 数据库修改禁令

从 Dday V1 开始，Codex 不允许自行修改数据库结构。

## 禁止修改

- src/db/schema.ts
- migrations/*
- drizzle schema
- wrangler D1 binding
- 数据库字段名
- 数据库状态枚举
- 新增表
- 删除表

## 允许修改

Codex 可以修改：

- routes
- services
- frontend UI
- 表单字段映射
- 查询逻辑
- service 层业务逻辑

但必须基于现有 V1 数据库结构。

## 如需数据库变更

Codex 只能输出以下格式的变更申请：

### 数据库变更申请

- 变更原因：
- 影响业务：
- 涉及表：
- 涉及字段：
- 是否可用现有字段替代：
- 不修改会造成什么问题：
- 推荐方案：

未经人工确认，不得修改数据库。
