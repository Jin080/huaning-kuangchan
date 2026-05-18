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

## Retest: 2026-05-17 20:20 - T13 主流程联调验收与权限用例复测

本节为追加记录，不覆盖历史失败记录。当前业务模块已交付到 T17，T13 本轮只记录验收结论和缺陷归因，不修改业务代码或 Prisma schema。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | Git 可用；仍有前序会话未提交/未跟踪文件和既有 `renzheng/*.png` 删除项 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` completed without errors |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 16 test suites passed, 62 tests passed |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | TypeScript build and Vite production build completed |

## T13 Current Acceptance Result

| Area | Status | Reason |
|---|---|---|
| T01-T17 delivery status review | PASS | `docs/task-board.md` records T01-T12/T15-T17 as DONE, T13 as TODO before this session, T14 BLOCKED pending T13 |
| Backend full verification gate | PASS | lint/typecheck/test all pass; 16 suites, 62 tests |
| Frontend static verification gate | PASS | lint/build pass |
| Backend main-flow service coverage | PASS_PARTIAL | Service tests cover lots, reviews, enterprises, deposits, bids, auction closing, results, contracts, refunds, blacklist, portal, account |
| Full frontend-backend main flow | BLOCKED | frontend write paths for create lot, enterprise register submit, deposit upload, bid submit are not wired to real API |
| Lot announcing-to-bidding transition | BLOCKED | No reviewed automatic/manual transition found from `ANNOUNCING` to `BIDDING`; bid API requires `BIDDING` |
| Permission exception retest | PASS_PARTIAL | Backend service tests cover bidding/auth/deposit/blacklist/account isolation cases; sensitive file permission not verified by HTTP/E2E |
| Frontend fallback safety | FAIL_FOR_ACCEPTANCE | `withFallback` can render mock data on backend failure, so UI visual checks may mask failed real API integration |
| T14 readiness | READY_WITH_BLOCKERS | Engineering gates pass, but T14 must start as integration收口 and defect-routing session, not as release approval |

## T13 Defect and Blocker Log

| ID | Type | Severity | Reproduction Steps | Expected | Actual | Impact Module | Suggested Owner Session |
|---|---|---|---|---|---|---|---|
| T13-BLOCK-001 | E2E coverage | High | Attempt to execute PRD main flow from frontend through backend and DB | One repeatable HTTP/DB acceptance script or documented executable manual data path | No complete E2E script/data setup exists; evidence is service-level tests plus docs | 测试验收 / 集成发布 | T14 or independent E2E session |
| T13-BLOCK-002 | Frontend integration | High | Use UI to create lot, submit enterprise register, upload deposit voucher, or submit bid | UI calls real write APIs and surfaces backend errors | These actions are static or not wired to corresponding write APIs | 前端接入 | T14 集成发布收口 |
| T13-BLOCK-003 | Backend state transition | High | Move approved lot from `公示中` to `竞拍中` before bidding | Explicit job, endpoint, or data-prep rule advances lot to `BIDDING` | Only bidding service requires `BIDDING`; no transition from `ANNOUNCING` found | 拍品/竞价联调 | T14 confirm or route backend返工 |
| T13-BLOCK-004 | Frontend fallback | High | Break backend/API base then open portal/account/admin list pages | Acceptance UI should clearly fail or expose real API failure in acceptance mode | Pages can render mock data via `withFallback` | 前端 API 适配 | T14 |
| T13-MAJOR-001 | Test coverage | Medium | Verify attachment permission over HTTP | Unauthorized sensitive voucher/certification attachment access is rejected | Not covered in current main-flow HTTP/E2E evidence | 文件权限 | File permission/E2E follow-up |
| T13-MAJOR-002 | Frontend integration | Medium | Use backend blacklist/content create/edit file/log features from UI | All admin operations have real API wiring or are explicitly hidden | Some admin operations remain mock/static per checklist | 后台管理接入 | T14 or follow-up |
| T13-OPT-001 | UX | Low | Reject lot/enterprise/deposit from admin UI | Admin enters reject reason | Current page uses default reject reason | 后台体验 | Later optimization |

## T13 Conclusion

后端工程验证和前端静态验证通过；后端服务级测试已覆盖主流程关键业务规则和权限异常规则。主流程尚不能判定为完整联调通过，原因是前端关键写链路未接真实 API、`公示中` 到 `竞拍中` 的流转口径未闭合、以及 fallback 会掩盖真实 API 失败。建议启动 T14，但 T14 的首要目标应是修复/收口这些阻塞项后再做发布验收。

## Retest: 2026-05-17 - T14 集成发布收口与阻塞缺陷处理

本节为追加记录。T14 小范围补齐前端关键写链路、验收模式 fallback 策略、`ANNOUNCING` 到 `BIDDING` 显式推进口径，并新增 HTTP/DB 主流程验收脚本。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan/backend; npm test -- lots` | PASS | `LotsService` 5 个用例通过，包含 `ANNOUNCING` 进入竞拍窗口后推进为 `BIDDING` |
| `Set-Location E:/kuangchan/backend; npm test -- main-flow-http-db` | PASS | 1 个 HTTP/DB 主流程用例通过 |
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | Git 可用；工作区仍包含前序未提交/未跟踪文件与既有 `renzheng/*.png` 删除项，本轮未恢复 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` completed without errors |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 17 test suites passed, 64 tests passed |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | TypeScript build and Vite production build completed |

## T14 Current Acceptance Result

| Area | Status | Reason |
|---|---|---|
| Frontend write integration | PASS | 后台新建/编辑拍品、企业入驻提交、意向金上传、竞价报价提交已调用真实 API |
| Acceptance fallback safety | PASS | 设置 `VITE_ACCEPTANCE_MODE=true` 后 `withFallback` 不再回退 mock，真实 API 失败显性暴露 |
| Lot announcing-to-bidding transition | PASS | 新增 `POST /api/admin/lots/{id}/advance-to-bidding`，规则为 `ANNOUNCING` 且当前时间进入竞拍窗口 |
| Main flow executable E2E | PASS | `backend/test/e2e/main-flow-http-db.spec.ts` 可重复执行，覆盖 HTTP 写链路和真实 DB 状态 |
| Release judgement | PASS_WITH_REMAINING_GAPS | T14 指定工程 gate 与主流程 HTTP/DB E2E 已通过；剩余缺口为附件权限、竞拍结束调度入口、登录/JWT 和部分后台非主链路功能 |

## T14 Remaining Gaps

| ID | Severity | Gap | Suggested Owner |
|---|---|---|---|
| T14-MAJOR-001 | Medium | 敏感附件权限仍缺少 HTTP/E2E 验证 | 文件权限/E2E 后续任务 |
| T14-MAJOR-002 | Medium | 竞拍结束服务无 HTTP 管理入口或调度器；T14 E2E 使用 DI 调用既有服务 | 后续调度/运维任务 |
| T14-MAJOR-003 | Medium | 登录/JWT、内容新建/编辑、手动拉黑/解除拉黑、文件管理、操作日志前端真实接入仍未完成 | 后续后台接入任务 |

## Retest: 2026-05-17 - T18 发布前补强

本节为追加记录。T18 小范围补齐敏感附件权限 HTTP/DB 验证、竞拍结束轻量 HTTP 触发入口和发布前说明。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan/backend; npm test -- sensitive-files-http-db` | PASS | 1 个 HTTP/DB 用例通过，覆盖企业资质、营业执照、意向金凭证未授权企业访问拒绝 |
| `Set-Location E:/kuangchan/backend; npm test -- auction-closing-http-db` | PASS | 1 个 HTTP/DB 用例通过，覆盖管理员触发 `POST /api/admin/auction-closing/run` 生成成交结果，企业角色被拒绝 |

## T18 Current Acceptance Result

| Area | Status | Reason |
|---|---|---|
| Sensitive file permission HTTP/E2E | PASS | `GET /api/files/{id}` 对敏感附件执行权限判断，未授权企业返回 `FILE_FORBIDDEN` |
| Auction closing operations reachability | PASS | `POST /api/admin/auction-closing/run` 可触发既有 `AuctionClosingService.closeEndedAuctions()` |
| Main flow release scope | PASS | T14 主流程 HTTP/DB 证据继续有效，T18 未修改主流程已通过逻辑 |
| Remaining release notes | PASS | `docs/release-checklist.md` 记录主流程已通过范围、非阻塞剩余事项、`VITE_ACCEPTANCE_MODE=true` 和 `advance-to-bidding` 口径 |

## T18 Remaining Gaps

| ID | Severity | Gap | Suggested Owner |
|---|---|---|---|
| T18-NONBLOCK-001 | Medium | 登录/JWT 未实现，敏感附件权限仍依赖开发请求头模拟登录态 | 后续认证任务 |
| T18-NONBLOCK-002 | Medium | 竞拍结束未引入内置定时框架 | 运维可定时调用 `POST /api/admin/auction-closing/run`；若需内置调度需后续单独确认 |

## Retest: 2026-05-17 22:22 - T19 发布前人工复核与提交归档

本节为追加记录。T19 不修改业务代码、不修改 Prisma schema、不恢复 `renzheng/*.png`，只复核 T14/T18 文档证据、接口契约、测试记录与当前工作区状态。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | Git 可用；输出包含前序业务代码/文档改动、未跟踪后端模块和测试、既有 `renzheng/*.png` 删除项。 |
| `Set-Location E:/kuangchan; git diff --check` | PASS_WITH_WARNINGS | 无 whitespace error；仅输出 LF 将被 Git 转 CRLF 的 warning。 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | `eslint "{src,test}/**/*.ts"` exit 0。 |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` exit 0。 |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 19 test suites passed, 66 tests passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- main-flow-http-db` | PASS | `PASS test/e2e/main-flow-http-db.spec.ts`，1 test passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- sensitive-files-http-db` | PASS | `PASS test/e2e/sensitive-files-http-db.spec.ts`，1 test passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- auction-closing-http-db` | PASS | `PASS test/e2e/auction-closing-http-db.spec.ts`，1 test passed。 |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | `eslint .` exit 0。 |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | `tsc -b && vite build` exit 0；Vite 输出 `✓ built in 200ms`。 |

## T19 Release Judgement

| Area | Status | Reason |
|---|---|---|
| T14 verified range | PASS | 本轮主流程 HTTP/DB 验收脚本通过；覆盖发布复核、认证、意向金、竞价、成交、合同和看板链路。 |
| T18 verified range | PASS | 本轮敏感附件权限和竞拍结束 HTTP 入口脚本均通过。 |
| Interface contract | PASS | `docs/api-contract.md` 已登记 `advance-to-bidding`、`GET /api/files/{id}`、`POST /api/admin/auction-closing/run`。 |
| Business code diff from T19 | PASS | T19 仅修改发布/QA 文档并追加交接记录，未改业务代码。 |
| Commit readiness | NEEDS_REVIEW | 工作区仍有大量前序未提交/未跟踪文件和 `renzheng/*.png` 删除项，需总控确认是否整体纳入提交。 |
| Release preparation | READY_WITH_NONBLOCKING_GAPS | 工程 gate 和重点 E2E 均通过；登录/JWT、结构化延时竞价、后台非主链路真实接入、内置定时框架仍未实现。 |

## Retest: 2026-05-18 08:36 - T26 全量收口复核与提交前检查

本节为追加记录。T26 不修改业务代码、不修改 Prisma schema、不修改前端页面、不执行 git commit，不恢复或处理 `renzheng/*.png`。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | 工作区仍包含前序业务代码、前端接入、测试、文档改动和 5 个 `renzheng/*.png` 删除项。 |
| `Set-Location E:/kuangchan; git diff --stat` | PASS | 已跟踪 diff 为 25 个文件、4438 行新增、237 行删除；未跟踪文件不计入该统计。 |
| `Set-Location E:/kuangchan; git diff --check` | PASS_WITH_WARNINGS | 无 whitespace error；仅有 LF 将被 Git 转 CRLF 的 warning。 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | ESLint completed without errors。 |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` completed without errors。 |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 22 test suites passed, 77 tests passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- main-flow-http-db` | PASS | 1 个 HTTP/DB 主流程用例通过。 |
| `Set-Location E:/kuangchan/backend; npm test -- sensitive-files-http-db` | PASS | 1 个敏感附件权限 HTTP/DB 用例通过。 |
| `Set-Location E:/kuangchan/backend; npm test -- auction-closing-http-db` | PASS | 1 个竞拍结束 HTTP 入口用例通过。 |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | ESLint completed without errors。 |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | TypeScript build and Vite production build completed。 |

## T26 Current Acceptance Result

| Area | Status | Reason |
|---|---|---|
| T20-T25 handoff review | PASS | 任务板显示 T20、T21A、T21B、T21C、T22、T23、T24、T25 均为 DONE；交接记录均存在。 |
| Backend full verification gate | PASS | lint/typecheck/test 全部通过，全量测试 22 suites / 77 tests。 |
| Key HTTP/DB E2E gate | PASS | 三条关键 E2E 顺序复跑均通过。 |
| Frontend static gate | PASS | lint/build 均通过。 |
| Git whitespace gate | PASS_WITH_WARNINGS | 无 whitespace error；存在 LF/CRLF warning。 |
| Commit readiness | READY_NEEDS_CONFIRMATION | 工程验证达到提交准备门槛；仍需总控确认提交范围和 `renzheng/*.png` 删除状态。 |

## T26 Remaining Risks

| ID | Severity | Risk | Suggested Owner |
|---|---|---|---|
| T26-RISK-001 | Medium | 登录/JWT 未实现，当前仍依赖开发请求头。 | 后续认证任务 |
| T26-RISK-002 | Medium | 结构化延时竞价与内置定时框架未实现。 | 后续竞价/运维任务 |
| T26-RISK-003 | Low | 后台首页最近操作日志仍保留 mock，文件管理/操作日志独立页面已接真实 API。 | 后续后台首页接入任务 |
| T26-RISK-004 | Low | 三条关键 E2E 共享测试数据库，不宜并行执行；本轮最终以顺序复跑通过为准。 | 测试执行规范 |
| T26-RISK-005 | Low | `git diff --check` 有 LF/CRLF warning。 | 总控提交策略确认 |

## Retest: 2026-05-18 10:39 - T30 前后端真实运行点击联调

本节为追加记录。T30 启动当前源码后端与前端验收模式，使用真实浏览器点击门户、后台、企业中心关键路径；本轮不修改业务代码、不修改 Prisma schema、不修改登录/JWT、不实施 T31。

### Engineering Gate

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | `eslint "{src,test}/**/*.ts"` exit 0。 |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` exit 0。 |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | `eslint .` exit 0。 |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | `tsc -b && vite build` exit 0；Vite 输出 `built in 244ms`。 |

### Service Startup

| Area | Result | Evidence |
|---|---|---|
| Backend current source service | PASS | `PORT=3100; npm run start` 启动成功，Nest 日志显示 `Nest application successfully started`，`GET http://127.0.0.1:3100/api/health` 返回 200。 |
| Existing backend on 3000 | INFO | 执行前发现 `3000` 已有 `node --enable-source-maps E:\kuangchan\backend\dist\src\main`，健康接口也返回本项目服务；T30 后续验收使用 3100 当前源码实例。 |
| Frontend acceptance service | PASS_WITH_BLOCKERS | `VITE_API_BASE_URL=http://127.0.0.1:3100/api; VITE_ACCEPTANCE_MODE=true; npm run dev -- --host 127.0.0.1 --port 5173` 启动成功，Vite ready。启动后真实 API 失败触发验收模式错误，未静默 fallback。 |

### Seed Result

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan/backend; npx prisma db seed` | EXIT_0_BUT_NO_DATA | 输出：`Environment variables loaded from .env`，随后仅显示 Prisma `6.8.2 -> 7.8.0` 升级提示；无业务错误。执行后只读计数仍为 `users=0,lots=0,enterprises=0,bids=0,notifications=0,deposits=0,contents=0`。未修改 `seed.ts`、`schema.prisma` 或 `package.json`。 |

### Direct HTTP API

| API | Result | Evidence |
|---|---|---|
| `GET /api/health` | PASS | 200。 |
| `GET /api/portal/dashboard` | PASS_EMPTY | 200，空库下成交统计为 0。 |
| `GET /api/lots` | PASS_EMPTY | 200，返回 `items=[]`。 |
| `GET /api/results` | PASS_EMPTY | 200，返回 `items=[]`。 |
| `GET /api/contents` | PASS_EMPTY | 200，返回 `items=[]`。 |
| `GET /api/admin/lots` with `x-user-id: admin_demo`, `x-user-role: ADMIN` | PASS_EMPTY | 200，返回 `items=[]`。 |
| `GET /api/admin/logs` with `x-user-id: admin_demo`, `x-user-role: ADMIN` | PASS | 200，返回操作日志列表。 |
| `GET /api/lots?pageSize=100` | FAIL | 400，响应提示 `pageSize must be an integer number`；`LotQueryDto` 未对查询参数做 `Type(() => Number)` 转换。 |
| `GET /api/admin/lots?pageSize=100` | FAIL | 400，同上。前端当前调用该 URL。 |
| `GET /api/account/profile` with `x-user-id: enterprise_demo`, `x-user-role: ENTERPRISE` | FAIL | 500，空库且默认 `enterprise_demo` 是 username 口径，不是可用用户 UUID。 |

### Browser Acceptance

| Area | Click Coverage | Result | Evidence |
|---|---|---|---|
| 门户 | `/`、`/announcements/upcoming`、`/auctions/live`、`/results`、`/news` | BLOCKED_REAL_API | 页面跳转成立；浏览器请求 `http://127.0.0.1:3100/api/...` 被 CORS 拦截，控制台报 `No 'Access-Control-Allow-Origin' header` 与 `验收模式下真实 API 请求失败，已阻止 mock fallback`。页面仍显示 mock 初始数据，不能判定真实 API 加载通过。 |
| 后台 | `/admin/dashboard`、`/admin/lots`、`/admin/reviews/lots`、`/admin/logs` | BLOCKED_REAL_API | 页面跳转成立；带 `x-user-id/x-user-role` 的后台请求触发 OPTIONS 预检，后端返回 `Cannot OPTIONS /api/admin/logs?pageSize=100` 或浏览器 CORS 失败。后台页面显示 mock/fallback 数据，不能判定真实 API 加载通过。 |
| 企业中心 | `/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages` | BLOCKED_REAL_API | 页面跳转成立；企业端请求被 CORS 预检拦截，且 seed 未写入用户，无法取得可用企业用户 UUID。页面显示 mock/fallback 数据，不能判定真实 API 加载通过。 |

### Auth Header Used

| Role | Header Used | Verification Result |
|---|---|---|
| ADMIN | `x-user-id: admin_demo`, `x-user-role: ADMIN` | 后台只读接口直连可访问部分接口，例如 `/api/admin/logs` 200；浏览器因 CORS 预检失败，不能完成前端真实 API 加载验收。 |
| ENTERPRISE | `x-user-id: enterprise_demo`, `x-user-role: ENTERPRISE` | 当前不是可用用户 UUID；空库下 `/api/account/profile` 返回 500。未取得可用企业用户 UUID。 |

### T30 Judgement

| Area | Result | Reason |
|---|---|---|
| 前端 lint/build 不退化 | PASS | 本轮 fresh `lint/build` 均通过。 |
| 后端服务可启动 | PASS | 当前源码服务在 3100 启动，健康接口 200。 |
| 关键 API 可访问 | PASS_PARTIAL | 健康、门户看板、默认列表、后台日志可直连；拍品列表带 `pageSize` 查询失败，企业中心默认开发头失败。 |
| 门户 3 条点击链路 | CLICK_PASS_API_BLOCKED | 跳转成立，真实 API 被 CORS 阻断。 |
| 后台 3 条点击链路 | CLICK_PASS_API_BLOCKED | 跳转成立，真实 API 被 CORS/OPTIONS 阻断。 |
| 企业中心 3 条点击链路 | CLICK_PASS_API_BLOCKED | 跳转成立，真实 API 被 CORS/OPTIONS 阻断，且缺可用企业用户 UUID。 |
| 真实 API 失败处理 | PASS | 失败未写成通过；本节明确标记阻塞。 |

### Blockers

| ID | Severity | Issue | Evidence | Suggested Owner |
|---|---|---|---|---|
| T30-BLOCK-001 | High | 前端验收模式配置到绝对真实 API 地址后，后端未启用 CORS/OPTIONS，浏览器真实 API 全链路被拦截。 | 控制台：`No 'Access-Control-Allow-Origin' header`；OPTIONS `/api/admin/logs?pageSize=100` 返回 404 `Cannot OPTIONS ...`。 | 后端基础/集成联调 |
| T30-BLOCK-002 | High | `npx prisma db seed` 退出码为 0 但未写入开发数据，无法提供可用 admin/enterprise 用户 UUID 和真实列表数据。 | seed 后 `users=0,lots=0,enterprises=0,contents=0`。 | 环境/数据模型 |
| T30-BLOCK-003 | High | 前端调用 `/api/lots?pageSize=100`、`/api/admin/lots?pageSize=100`，后端返回 400，查询参数未转换为数字。 | 直连 HTTP 400：`pageSize must be an integer number`。 | 后端拍品/API DTO |
| T30-BLOCK-004 | High | 企业中心默认开发请求头使用 `enterprise_demo`，但账号接口按用户 UUID 查询；空库下返回 500。 | `/api/account/profile` with `enterprise_demo` 返回 500。 | 认证/账号联调 |

### Non-Blocking / Notes

- 页面点击跳转本身基本可达，T29 导航能力在真实运行环境下继续成立。
- 前端页面在验收模式下抛错但仍保留初始 mock 视觉内容，人工验收时不能以页面可见表格判定真实 API 成功。
- `frontend/vite.config.ts` 当前无 dev proxy；若继续使用默认 `/api` 而非绝对 API 地址，也需要明确代理或同源部署方案。

## Retest: 2026-05-18 10:53 - T30A CORS/OPTIONS 最小修复

本节为追加记录。T30A 仅修复后端入口 CORS/OPTIONS 配置，未修改 Prisma schema、前端 API 逻辑、登录/JWT、seed 或列表 DTO。

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan/backend; npm test -- main-cors` | PASS | 新增 `application CORS` 用例通过，覆盖 `Origin: http://127.0.0.1:5173` 与 `Access-Control-Request-Headers: x-user-id,x-user-role` 的 OPTIONS 预检。 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | `eslint "{src,test}/**/*.ts"` exit 0。 |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` exit 0。 |
| `curl.exe -i -X OPTIONS http://127.0.0.1:3100/api/admin/logs?pageSize=100 -H "Origin: http://127.0.0.1:5173" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: x-user-id,x-user-role"` | PASS | 返回 `HTTP/1.1 204 No Content`，包含 `Access-Control-Allow-Origin: http://127.0.0.1:5173`、`Access-Control-Allow-Methods: GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS`、`Access-Control-Allow-Headers: Content-Type,Authorization,x-user-id,x-user-role`。 |

### T30A Result

| Area | Result | Reason |
|---|---|---|
| OPTIONS preflight | PASS | `/api/admin/logs?pageSize=100` 的 OPTIONS 不再返回 `Cannot OPTIONS ...`。 |
| Browser CORS header | PASS_BY_HTTP_PREFLIGHT | 预检响应已返回匹配 5173 的 `Access-Control-Allow-Origin`。 |
| Development auth headers | PASS | CORS allow headers 明确包含 `x-user-id` 与 `x-user-role`。 |

### T30 Items Outside T30A

- T30-BLOCK-002：seed 开发数据不属于 T30A 修复范围，当前状态以 T30B 或后续复测记录为准。
- T30-BLOCK-003：`pageSize=100` 查询参数数字转换不属于 T30A 修复范围，当前状态以 T30C 或后续复测记录为准。
- T30-BLOCK-004：企业中心默认开发用户 ID 不属于 T30A 修复范围，当前状态以 seed/认证联调或后续复测记录为准。
