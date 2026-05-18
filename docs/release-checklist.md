# Release Checklist

## T18 发布前补强结论

- 主流程收口范围：T14 已覆盖后台创建拍品、提交复核、复核通过、企业入驻、企业审核、意向金上传与审核、`advance-to-bidding` 推进竞拍、非法报价拒绝、有效报价、竞拍结束成交、成交公示发布、合同签约/完成和门户看板统计。
- 验收模式：前端发布验收需设置 `VITE_ACCEPTANCE_MODE=true`，真实 API 失败时不得依赖 mock fallback 判定通过。
- `advance-to-bidding` 正式口径：本阶段 `公示中` 到 `竞拍中` 使用管理员显式接口 `POST /api/admin/lots/{id}/advance-to-bidding`，不启用自动公示转竞拍调度。
- 竞拍结束处理口径：发布前提供管理员轻量触达入口 `POST /api/admin/auction-closing/run`，用于触发 `AuctionClosingService.closeEndedAuctions()`；后续如需自动化，可在不改变业务语义的前提下接入外部运维定时调用。
- 敏感附件权限口径：发布前提供 `GET /api/files/{id}`，敏感附件仅允许管理员、上传用户或附件所属企业用户访问；其他企业访问返回 `FILE_FORBIDDEN`。

## 非阻塞剩余事项

- 登录/JWT 未实现，当前仍使用开发请求头 `x-user-id`、`x-user-role`。
- 结构化延时竞价不在本次范围内，仍待总控确认数据字段和规则。
- 后台新建/编辑内容、手动拉黑/解除拉黑、文件管理、操作日志前端真实接入仍待后续阶段。
- 竞拍结束自动定时框架未引入；当前发布建议为管理员手动触发或由外部运维定时调用 `POST /api/admin/auction-closing/run`。

## 发布建议

- 可按 T14 + T18 范围进入发布前人工复核。
- 发布验收必须同时保留 HTTP/DB E2E 证据和前端 `VITE_ACCEPTANCE_MODE=true` 构建/运行口径。
- 生产化上线前需把开发请求头认证替换为真实登录/JWT，并重新验证敏感附件权限。

## T19 发布前人工复核 - 2026-05-17 22:22

### 本轮复核范围

- T14 已验证范围：后台创建/编辑拍品、提交复核、发布复核通过、企业入驻、企业审核、意向金上传与审核、`POST /api/admin/lots/{id}/advance-to-bidding` 推进竞拍、非法报价拒绝、有效报价、竞拍结束成交、成交公示发布、合同签约/完成、门户看板统计；本轮用 `npm test -- main-flow-http-db` 复核通过。
- T18 已验证范围：`GET /api/files/{id}` 敏感附件权限 HTTP/DB 验证，`POST /api/admin/auction-closing/run` 管理员竞拍结束触达入口；本轮分别用 `npm test -- sensitive-files-http-db` 与 `npm test -- auction-closing-http-db` 复核通过。
- 接口契约复核：`docs/api-contract.md` 已登记 `POST /api/admin/lots/{id}/advance-to-bidding`、`GET /api/files/{id}`、`POST /api/admin/auction-closing/run`；未发现 T19 需要新增接口。
- 工作区状态复核：当前工作区仍为脏状态，包含前序业务代码/文档改动、未跟踪后端模块与测试、既有 `renzheng/*.png` 删除项；T19 不恢复、不覆盖这些历史状态。

### 本轮验证命令输出

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | 输出包含 `M backend/src/app.module.ts`、`M frontend/src/services/api.ts`、`D renzheng/PixPin_2026-05-17_11-22-22.png` 等既有变更，以及 `?? backend/src/modules/`、`?? backend/test/e2e/`、`?? docs/release-checklist.md` 等未跟踪文件。 |
| `Set-Location E:/kuangchan; git diff --check` | PASS_WITH_WARNINGS | 无 whitespace error；输出为 LF 将被 Git 转 CRLF 的 warning。 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | `eslint "{src,test}/**/*.ts"`，exit 0。 |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit`，exit 0。 |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | `Test Suites: 19 passed, 19 total`; `Tests: 66 passed, 66 total`。 |
| `Set-Location E:/kuangchan/backend; npm test -- main-flow-http-db` | PASS | `PASS test/e2e/main-flow-http-db.spec.ts`; `1 passed, 1 total`。 |
| `Set-Location E:/kuangchan/backend; npm test -- sensitive-files-http-db` | PASS | `PASS test/e2e/sensitive-files-http-db.spec.ts`; `1 passed, 1 total`。 |
| `Set-Location E:/kuangchan/backend; npm test -- auction-closing-http-db` | PASS | `PASS test/e2e/auction-closing-http-db.spec.ts`; `1 passed, 1 total`。 |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | `eslint .`，exit 0。 |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | `tsc -b && vite build`; `✓ built in 200ms`，输出 `dist/assets/index-DOyOHN67.js`。 |

### 未实现事项

- 登录/JWT 未实现，当前仍使用开发请求头 `x-user-id`、`x-user-role` 模拟登录态。
- 结构化延时竞价未实现，本阶段仅保留字段/规则说明，未引入延时竞价状态机。
- 后台非主链路真实接入未完成：后台新建/编辑内容、手动拉黑/解除拉黑、文件管理、操作日志仍未完成前端真实写链路或真实页面接入。
- 内置定时框架未实现；竞拍结束当前通过管理员手动触发或外部运维定时调用 `POST /api/admin/auction-closing/run`。

### 提交前风险清单

- 工作区尚未提交，且包含大量前序业务代码、文档、测试与未跟踪文件；提交前需由总控确认是否整体纳入同一提交。
- `renzheng/*.png` 当前为删除状态，按任务限制 T19 未恢复；提交前需确认这些删除是否保留。
- `git diff --check` 无空白错误，但有 LF/CRLF warning；如仓库需要固定换行策略，应在提交前统一确认。
- 发布验收必须设置 `VITE_ACCEPTANCE_MODE=true`，避免真实 API 失败被 mock fallback 掩盖。
- 生产化认证切换到登录/JWT 后，必须重新验证敏感附件权限和企业数据隔离。

### 发布判断

- 可以进入提交/发布准备：T14 主流程收口和 T18 发布前补强均有本轮命令复核通过证据，发布前工程 gate 通过。
- 不建议直接声明生产可上线：登录/JWT、结构化延时竞价、后台非主链路真实接入、内置定时框架仍为明确未实现事项。

## T26 全量收口复核 - 2026-05-18 08:36

### 本轮复核范围

- 已复核 `docs/task-board.md`：T20、T21A、T21B、T21C、T22、T23、T24、T25 均为 DONE。
- 已复核 `docs/agent-handoff.md`：T20-T25 均有交接记录；T23A 有首次失败记录与最终复跑通过补充记录。
- 已复核 `docs/frontend-backend-integration-checklist.md`：后台内容、黑名单、文件管理、操作日志真实接入状态已更新；后台首页最近操作日志仍保留 mock。
- 本轮未修改业务代码、未修改 Prisma schema、未修改前端页面、未执行 git commit，未恢复或处理 `renzheng/*.png`。

### 本轮验证命令输出

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | 工作区包含前序业务代码/测试/文档改动、未跟踪后端模块和文档，以及 5 个 `renzheng/*.png` 删除项。 |
| `Set-Location E:/kuangchan; git diff --stat` | PASS | 已跟踪 diff 为 25 个文件、4438 行新增、237 行删除；未跟踪文件不计入该统计。 |
| `Set-Location E:/kuangchan; git diff --check` | PASS_WITH_WARNINGS | 无 whitespace error；仅有 LF 将被 Git 转 CRLF 的 warning。 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | `eslint "{src,test}/**/*.ts"` exit 0。 |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` exit 0。 |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 22 test suites passed, 77 tests passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- main-flow-http-db` | PASS | `PASS test/e2e/main-flow-http-db.spec.ts`，1 test passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- sensitive-files-http-db` | PASS | `PASS test/e2e/sensitive-files-http-db.spec.ts`，1 test passed。 |
| `Set-Location E:/kuangchan/backend; npm test -- auction-closing-http-db` | PASS | `PASS test/e2e/auction-closing-http-db.spec.ts`，1 test passed。 |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | `eslint .` exit 0。 |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | `tsc -b && vite build` exit 0；Vite 输出 `✓ built in 542ms`。 |

### 提交范围建议

- 建议本阶段提交纳入：后端业务模块、后台文件/日志只读接口、操作日志持久化、后端单测与 HTTP/DB E2E、前端真实 API 接入、API 文档、QA 文档、发布文档、任务板和交接记录。
- 建议提交前仍单独确认 `renzheng/*.png` 删除项是否纳入；本轮按限制未恢复、未处理。
- 如总控决定拆分提交，建议按“后端业务与测试、前端接入、文档归档”拆分；但当前工作区大量文件仍为未提交/未跟踪状态，拆分前需先人工确认边界。

### 剩余风险与待确认

- 登录/JWT 未实现，生产化认证切换后需重跑主流程、敏感附件权限和企业数据隔离。
- 结构化延时竞价、内置定时框架、后台首页最近操作日志真实接入仍是后续事项。
- 三条关键 E2E 不宜并行跑在同一测试数据库上；本轮曾并行触发测试数据互相干扰，最终验收以顺序复跑通过为准。
- `git diff --check` 仍有 LF/CRLF warning；提交前需确认是否接受当前换行策略。

### 发布判断

- 可以进入提交准备：本轮后端、前端、关键 E2E 和 whitespace gate 均已通过。
- 不建议直接生产上线：仍需总控确认提交范围、`renzheng/*.png` 删除状态，以及后续登录/JWT 等生产化事项。
