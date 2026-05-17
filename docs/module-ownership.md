# Module Ownership

用于避免多个模块会话同时修改同一核心文件。除总控明确授权外，模块会话不得修改本文件、接口契约和任务总表。

## 全局规则

- 总控文档归总控会话维护：`docs/agent-handoff.md`、`docs/module-ownership.md`、`docs/api-contract.md`、`docs/integration-checklist.md`、`docs/task-board.md`。
- 执行会话完成后可按指定格式追加 `docs/agent-handoff.md`，不得重写历史记录。
- `frontend/src/services/api.ts` 是前后端接入点，默认由集成/前端适配会话维护，其他会话不得抢改。
- `frontend/src/App.tsx` 是路由注册核心文件，只允许路由/集成会话小范围修改。
- `backend/prisma/schema.prisma` 只允许数据模型会话维护；业务会话不得直接重写。
- 竞价核心必须等待用户、拍品、意向金资格模型稳定后启动。

## 模块边界

| 会话 | 允许修改范围 | 禁止修改范围 | 启动状态 |
|---|---|---|---|
| 后端基础架构 | `backend/package.json`、`backend/src/**`、`backend/prisma/**` 初始骨架、环境示例、基础测试 | 前端页面、总控契约、业务模块实现 | TODO |
| 数据模型与状态机 | `backend/prisma/schema.prisma`、迁移、状态枚举、数据字典文档 | 前端页面、竞价业务实现、总控文档大改 | TODO，依赖后端骨架 |
| 前台门户 | `frontend/src/pages/PortalPages.tsx`、门户组件小范围、门户样式 | `frontend/src/services/api.ts` 全局契约、后台页面、后端 schema | BLOCKED，等 API 契约稳定 |
| 拍品与发布复核后台 | 后台拍品页面/API 对应模块文件 | 数据模型重写、竞价引擎、企业认证页面 | BLOCKED，等后端基础和模型 |
| 企业入驻与认证 | 企业注册/认证相关前后端模块 | 拍品、竞价、合同退款模块 | BLOCKED，等后端基础和模型 |
| 意向金凭证与资格 | 意向金上传、审核、资格校验模块 | 竞价结算、合同退款、schema 重写 | BLOCKED，等拍品和企业认证模型 |
| 竞价核心 | 报价校验、出价记录、最高价、结束中标任务 | 用户/拍品/意向金基础模型 | BLOCKED，等用户、拍品、意向金稳定 |
| 成交合同退款黑名单 | 成交结果、合同状态、退款状态、黑名单模块 | 竞价核心、数据看板计算口径改写 | BLOCKED，等竞价结果模型 |
| 个人中心消息 | 个人中心、消息、我的认证/意向金/出价 | 公共 bid-record 权限、竞价核心 | BLOCKED，等认证、意向金、竞价结果 |
| 内容管理公开说明 | 内容管理、资讯、公开说明模块 | 交易核心、数据模型重写 | BLOCKED，等后端基础 |
| 测试验收 | `docs/qa/**`、测试用例、验收记录 | 业务实现代码，除非总控授权小修 | TODO |
| 集成发布 | `frontend/src/services/api.ts`、环境配置、接入适配、联调文档 | 大范围页面重构、schema 重写 | BLOCKED，等后端 API 可用 |

## 当前核心文件归属

| 文件 | 归属 | 说明 |
|---|---|---|
| `frontend/src/services/api.ts` | 集成会话 | 当前 mock 接入点，后续替换真实 API |
| `frontend/src/types.ts` | 数据模型/前端适配共同确认，总控授权后改 | 当前为展示类型，不等同后端 DTO |
| `frontend/src/App.tsx` | 路由/集成会话 | 当前 lint 报错来源，需小范围拆出 `routeCatalog` |
| `backend/prisma/schema.prisma` | 数据模型会话 | 当前不存在 |
| `docs/api-contract.md` | 总控会话 | 全局接口契约 |
| `docs/task-board.md` | 总控会话 | 任务总表 |
