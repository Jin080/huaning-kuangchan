# Integration Verification Record

记录时间：2026-05-17 15:52

本记录只描述测试验收与联调结果，不直接修改业务实现。

## Environment Snapshot

| Item | Result |
|---|---|
| Root package | `E:/kuangchan/package.json` 不存在 |
| Frontend package | `E:/kuangchan/frontend/package.json` 存在 |
| Backend package | `E:/kuangchan/backend/package.json` 存在 |
| Backend dependencies | `E:/kuangchan/backend/node_modules` 不存在 |
| Prisma schema | `E:/kuangchan/backend/prisma/schema.prisma` 不存在 |
| Existing backend tests | `backend/test/app-health.spec.ts`, `backend/test/common-response.spec.ts` |
| Existing QA doc | `docs/qa/main-flow-acceptance.md` |

## Command Results

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | FAIL | `fatal: not a git repository (or any of the parent directories): .git` |
| `Set-Location E:/kuangchan/frontend; npm run lint` | FAIL | `frontend/src/App.tsx:75:14 react-refresh/only-export-components` |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | Vite build completed, output under `frontend/dist` |
| `Set-Location E:/kuangchan/backend; npm run lint` | FAIL | `'eslint' is not recognized as an internal or external command` |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | FAIL | `'tsc' is not recognized as an internal or external command` |
| `Set-Location E:/kuangchan/backend; npm test` | FAIL | `'jest' is not recognized as an internal or external command` |
| `Set-Location E:/kuangchan; npm run test:e2e` | FAIL | Root `package.json` not found |

## Retest: 2026-05-17 16:29

后端基础架构和数据模型会话追加交付后，测试验收会话进行复测。本节为追加记录，不覆盖 15:52 的历史结果。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | FAIL | `fatal: not a git repository (or any of the parent directories): .git` |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` completed without errors |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 2 test suites passed, 4 tests passed |
| `Set-Location E:/kuangchan/backend; npx prisma validate` | PASS | `prisma/schema.prisma` is valid |
| `Set-Location E:/kuangchan/frontend; npm run lint` | FAIL | `frontend/src/App.tsx:75:14 react-refresh/only-export-components` |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | Vite build completed |
| `Set-Location E:/kuangchan; npm run test:e2e` | FAIL | Root `package.json` not found |

## Current Acceptance Result

| Area | Status | Reason |
|---|---|---|
| PRD traceability | PASS | 已建立 `docs/qa/prd-acceptance-test-matrix.md` |
| Main flow executable E2E | BLOCKED | 拍品、企业、意向金、竞价、成交、合同、看板 API 未实现 |
| Permission exception executable E2E | BLOCKED | 认证、权限、文件、黑名单、竞价错误码尚无完整后端实现 |
| Frontend static build | PASS | `npm run build` 通过 |
| Frontend lint gate | FAIL | 既有 Fast Refresh lint 问题 |
| Backend verification gate | PASS | 16:29 复测：后端 lint/typecheck/test 与 Prisma validate 均通过 |
| Root E2E command | BLOCKED | 根目录无 `package.json` 和 `test:e2e` 脚本 |

## Defect and Blocker Log

| ID | Type | Severity | Reproduction Steps | Expected | Actual | Impact Module | Suggested Owner Session |
|---|---|---|---|---|---|---|---|
| QA-BLOCK-001 | Environment | High | 在 `E:/kuangchan` 执行 `git status --short` | 返回工作区状态 | 报错：不是 Git 仓库 | 全局协作与变更审计 | 总控 / 环境 |
| QA-DEFECT-001 | Frontend lint | Medium | 在 `E:/kuangchan/frontend` 执行 `npm run lint` | lint 通过 | `frontend/src/App.tsx:75:14` 触发 `react-refresh/only-export-components` | 前端基础 | 前端基础或路由/集成会话 |
| QA-BLOCK-002 | Backend dependencies | High | 在 `E:/kuangchan/backend` 执行 `npm run lint`、`npm run typecheck`、`npm test` | 后端 lint/typecheck/test 可运行 | `eslint`、`tsc`、`jest` 命令不可识别；`backend/node_modules` 不存在 | 后端基础架构 | 后端基础架构 |
| QA-BLOCK-003 | Data model | High | 检查 `E:/kuangchan/backend/prisma/schema.prisma` | Prisma schema 存在并覆盖 PRD 核心实体 | 文件不存在 | 数据模型与状态机 | 数据模型与状态机 |
| QA-BLOCK-004 | E2E script | Medium | 在 `E:/kuangchan` 执行 `npm run test:e2e` | 执行端到端测试脚本 | 根目录 `package.json` 不存在 | 测试验收 / 集成发布 | 总控 / 测试验收 |
| QA-BLOCK-005 | Business API readiness | High | 按主流程调用拍品、企业、意向金、竞价、成交、合同、看板 API | 全流程可执行并验证状态流转 | 当前仅有后端骨架测试文件，业务接口未就绪 | T05-T14 多模块 | 各业务模块会话按依赖顺序推进 |

## Retest Status Updates

| ID | Updated Status | Evidence | Remaining Action |
|---|---|---|---|
| QA-BLOCK-002 | CLOSED | 16:29 复测后端 `npm run lint`、`npm run typecheck`、`npm test` 均通过 | 无，后续由业务模块补充业务测试 |
| QA-BLOCK-003 | CLOSED_FOR_SCHEMA_VALIDATION | 16:29 复测 `npx prisma validate` 通过，schema 已存在 | 仍需真实 PostgreSQL 后执行迁移验证 |
| QA-BLOCK-005 | OPEN | 后端基础与 schema 可验证，但主流程业务 API 尚未实现 | 等 T05-T14 业务模块交付后重跑主流程验收 |

## Responsibility Routing

| Scenario Group | Primary Owner | Secondary Owner |
|---|---|---|
| 统一响应、认证、文件权限、操作日志 | 后端基础架构 | 集成发布 |
| Prisma schema、状态枚举、数据字典 | 数据模型与状态机 | 后端基础架构 |
| 拍品创建、复核、公示 | 拍品与发布复核后台 | 前台门户接入 |
| 企业入驻、认证审核、驳回重提 | 企业入驻与认证 | 个人中心消息 |
| 意向金上传、审核、资格校验 | 意向金凭证与资格 | 文件权限 / 竞价核心 |
| 报价校验、最高价、结束中标 | 竞价核心 | 成交合同退款黑名单 |
| 成交通知、失败通知、个人中心消息 | 个人中心消息 | 成交合同退款黑名单 |
| 成交公示、合同、退款、黑名单 | 成交合同退款黑名单 | 前台门户接入 |
| 数据看板合同完成统计口径 | 前台门户接入 / 集成发布 | 成交合同退款黑名单 |

## Next Verification Gate

建议在以下条件满足后重新执行主流程验收：

1. 拍品、企业、意向金、竞价、成交、合同、退款、黑名单、看板接口至少提供可联调实现。
2. 真实 PostgreSQL `DATABASE_URL` 可用，并完成 Prisma migration 验证。
3. 根目录或约定位置提供 `test:e2e` 脚本，或明确改用 `frontend/tests/**` / `backend/test/e2e/**` 的执行命令。
4. 前端 Fast Refresh lint 问题修复后重跑 `frontend npm run lint`。
