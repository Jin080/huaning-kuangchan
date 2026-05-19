# Main Flow Acceptance Checklist

This checklist verifies the PRD main path: 拍品发布 -> 企业认证 -> 意向金审核 -> 竞价 -> 成交 -> 合同完成 -> 数据看板计入.

## Preconditions

- Admin account exists and can access backend management APIs.
- Enterprise account exists or can register.
- File upload supports lot images, inspection reports, business license, and deposit voucher.
- Server time can be controlled or test data can be created with valid publicity and auction windows.
- Dashboard API computes from completed contracts, not merely published results.

## Test Data

- Lot title: `E2E-华宁矿产竞拍主流程`
- Start price: `100`
- Bid increment: `10`
- Deposit amount: `1000`
- Enterprise A: certified bidder and eventual winner.
- Enterprise B: certified bidder and loser.

## Steps

1. Admin creates a lot draft with all PRD-required fields.
   - Verify: lot status is `草稿`.
   - Verify: required files and inspection report are attached.

2. Admin submits lot review.
   - Verify: lot status becomes `待发布复核`.
   - Verify: operation log records submit action.

3. Admin approves lot review.
   - Verify: lot status becomes `公示中`.
   - Verify: public upcoming list returns this lot.
   - Verify: live auction list does not return this lot yet.

4. Enterprise A and B submit certification.
   - Verify: certification status is `待审核`.
   - Verify: each enterprise can only view its own certification data.

5. Admin approves Enterprise A and B.
   - Verify: certification status is `审核通过`.
   - Verify: operation log records approval.

6. Enterprise A and B upload deposit vouchers during publicity.
   - Verify: deposit status is `待审核`.
   - Verify: voucher files are not publicly accessible.

7. Admin approves both deposit vouchers.
   - Verify: deposit status is `审核通过`.
   - Verify: both enterprises gain bidding qualification for this lot only.

8. Move lot into auction window.
   - Verify: lot status is `竞拍中`.
   - Verify: live auction list returns the lot.

9. Submit bid below current price or invalid increment.
   - Verify: API returns `INVALID_BID_INCREMENT`.
   - Verify: no bid record is created.

10. Enterprise A submits a valid bid.
    - Verify: bid record created with server receive time.
    - Verify: current highest price updates.

11. Enterprise B submits a higher valid bid.
    - Verify: Enterprise B becomes current highest bidder.
    - Verify: public bid records show masked enterprise names.

12. Enterprise A submits the final highest valid bid.
    - Verify: Enterprise A becomes current highest bidder.
    - Verify: Enterprise A account bid list shows its own real bid records.

13. Move lot past auction end and run close/winner confirmation.
    - Verify: highest bid wins.
    - Verify: result is generated.
    - Verify: winner notification and loser notification are generated.
    - Verify: admin can trigger closing through `POST /api/admin/auction-closing/run`.

14. Admin publishes result.
    - Verify: public result list shows lot title, winner enterprise name, final price.

15. Admin marks contract `已签约`, then `已完成`.
    - Verify: contract status changes are logged.
    - Verify: before `已完成`, dashboard does not count this result.
    - Verify: after `已完成`, dashboard count and amount include this result.

16. Admin updates loser refund state.
    - Verify: refund status can move `未退款` -> `审核中` -> `已退款`.
    - Verify: no refund voucher is required.

## Negative Permission Checks

- Visitor cannot submit deposit voucher or bid.
- Uncertified enterprise cannot submit deposit voucher.
- Certified enterprise without approved deposit cannot bid.
- Blacklisted enterprise cannot log in or operate and receives contact-platform-service prompt.
- Canceled/defaulted lot is hidden from public frontend lists.

## T13 Retest Record - 2026-05-17 20:20

本轮只做主流程联调验收和权限用例复测记录，不修改业务实现和 Prisma schema。

### Engineering Gate

| Command | Result | Evidence |
|---|---|---|
| `Set-Location E:/kuangchan; git status --short` | PASS_WITH_DIRTY_WORKTREE | Git 可用；工作区包含前序会话未提交改动、`backend/src/modules/**` 未跟踪文件、前端接入改动和既有 `renzheng/*.png` 删除项 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` completed without errors |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 16 test suites passed, 62 tests passed |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | ESLint completed without errors |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | TypeScript build and Vite production build completed |

### Main Flow Acceptance

| Step | Acceptance Result | Evidence | Attribution |
|---|---|---|---|
| 管理员创建拍品草稿 | BACKEND_PASS / FRONTEND_BLOCKED | `backend/test/lots/lots.service.spec.ts` covers draft creation; `POST /api/admin/lots` documented in `docs/lots-api.md`; admin new/edit page has form UI but no real create/edit submit wiring in `frontend/src/pages/AdminPages.tsx` / `frontend/src/services/api.ts` | 前端接入问题 |
| 提交发布复核 | PASS_PARTIAL | Backend service and admin page low-risk action are wired through `api.submitLotReview`; operation log call exists in `LotsService` | 后端接口可用，仍缺真实 HTTP/E2E 数据链路 |
| 复核通过进入公示 | PASS_PARTIAL | `LotReviewsService` and tests cover `PENDING_RELEASE_REVIEW` -> `ANNOUNCING`; public lot list filters hidden statuses only | 后端接口可用，仍缺真实 HTTP/E2E 数据链路 |
| 企业认证提交与审核通过 | BACKEND_PASS / FRONTEND_BLOCKED | `EnterprisesService` tests cover submit/review; `POST /api/enterprises/register` documented; enterprise register page is static form, no real submit wiring | 前端接入问题 |
| 企业上传意向金凭证并审核通过 | BACKEND_PASS / FRONTEND_BLOCKED | `DepositsService` tests cover voucher submit, review approve, qualification boundary; frontend upload button is not wired to `POST /api/lots/{id}/deposit-vouchers` | 前端接入问题 |
| 拍品进入竞拍期 | BLOCKED | Bidding service requires `LotStatus.BIDDING`; no reviewed transition/job from `ANNOUNCING` to `BIDDING` found, only closing job for ended `BIDDING` lots | 后端接口/状态流转缺口，或需明确数据准备方式 |
| 有资格企业报价 | BACKEND_PASS / FRONTEND_BLOCKED | `BidsService` tests cover qualified bid success and highest price update; portal bid input/buttons are not wired to `POST /api/lots/{id}/bids` | 前端接入问题 |
| 无资格、被拉黑、低价、过期报价被拒绝 | BACKEND_PASS | `backend/test/bids/bids.service.spec.ts` covers `DEPOSIT_NOT_APPROVED`, `BLACKLISTED`, `AUCTION_ENDED`, `INVALID_BID_INCREMENT`; pending certification path also covered | 后端服务级验证通过，仍缺真实 HTTP/E2E 复测 |
| 竞拍结束生成成交结果和通知 | BACKEND_PASS | `AuctionClosingService.closeEndedAuctions()` tests cover result generation and notifications for ended bidding lots | 后端服务级验证通过，仍缺调度入口/真实数据复测 |
| 发布成交公示 | PASS_PARTIAL | `ResultsService` tests cover public-only published results and publish action; admin action wired through `api.publishResult` | 后端接口可用，仍缺真实 HTTP/E2E 数据链路 |
| 自动生成未中标退款初始记录 | BACKEND_PASS | `backend/test/results/results.service.spec.ts` covers approved losing deposit vouchers generating `NOT_REFUNDED` refunds and idempotency | 后端服务级验证通过 |
| 合同完成后进入门户数据看板统计 | BACKEND_PASS / FRONTEND_PASS_READONLY | `ContractsService` and `PortalService` tests cover completed contract statistics; frontend dashboard reads `GET /api/portal/dashboard` with fallback | 读链路已接入，但 fallback 不可作为验收成功证据 |
| 合同违约后前台隐藏 | BACKEND_PASS / FRONTEND_RISK | `ContractsService` marks lot `DEFAULTED`; public lot service filters `DEFAULTED`; frontend public list fallback could still show mock data if real API fails | 后端服务级通过，前端 fallback 风险 |

### Permission Exception Retest

| Scenario | Result | Evidence | Attribution |
|---|---|---|---|
| 未登录或用户不存在报价 | BACKEND_PASS | `BidsService.getUserWithEnterprise` returns `UNAUTHORIZED` when user not found | 后端服务级验证 |
| 认证审核中企业报价 | BACKEND_PASS | `backend/test/bids/bids.service.spec.ts` expects `ENTERPRISE_CERTIFICATION_PENDING` | 后端服务级验证 |
| 未认证企业提交意向金/报价 | BACKEND_PASS | `DepositsService` and `BidsService` reject non-approved enterprise certification | 后端服务级验证 |
| 意向金未审核通过报价 | BACKEND_PASS | `BidsService` delegates to `DepositsService.hasBiddingQualification` and rejects with `DEPOSIT_NOT_APPROVED` | 后端服务级验证 |
| 被拉黑企业报价 | BACKEND_PASS | `BidsService` rejects `BLACKLISTED`; `BlacklistService` blocks enterprise users for reuse by auth/bidding | 后端服务级验证 |
| 低价或非加价幅度报价 | BACKEND_PASS | `BidsService.validateBidAmount` and tests reject `INVALID_BID_INCREMENT` | 后端服务级验证 |
| 过期或非竞拍期报价 | BACKEND_PASS | `BidsService.ensureLotCanReceiveBid` and tests reject `AUCTION_ENDED` | 后端服务级验证 |
| 敏感附件无权限访问 | NOT_VERIFIED | `FilePolicyService` exists, but this round did not cover voucher/certification attachment access control through HTTP/E2E | 后端接口/测试覆盖缺口 |
| 企业只能看本企业数据 | BACKEND_PASS | `backend/test/account/account.service.spec.ts` covers current enterprise deposits, bids, messages, and rejecting other enterprise message read | 后端服务级验证 |

### Fallback Risk

`frontend/src/services/api.ts` uses `withFallback` for all current read requests and for account message read. This prevents white screen, but it can hide critical acceptance failures:

- Backend down, wrong `VITE_API_BASE_URL`, missing dev auth headers, 404/500 responses, or shape mismatches can still render mock data.
- Public lists, dashboard, account center, and admin list pages cannot be accepted by visual inspection alone.
- Acceptance must use network evidence or disable fallback in a T14 verification mode before marking a frontend-backend path as passed.
- Admin state-changing actions generally do not use `withFallback`, but create/edit lot, enterprise register submit, deposit upload, and bid submit are still not wired as real frontend actions.

### Defect Classification

| ID | Severity | Defect | Attribution | Suggested Session |
|---|---|---|---|---|
| T13-BLOCK-001 | 阻塞级 | 主流程没有可重复执行的 HTTP/DB E2E 脚本或手工脚本数据包；当前只能用服务级单测拼接链路证据 | 数据准备问题 / 测试验收缺口 | T14 或独立 E2E 会话 |
| T13-BLOCK-002 | 阻塞级 | 前端关键写链路未真实接入：新建/编辑拍品、企业入驻提交、意向金上传、报价提交 | 前端接入问题 | T14 集成发布收口 |
| T13-BLOCK-003 | 阻塞级 | 未发现 `公示中` 自动或可操作进入 `竞拍中` 的状态流转；报价接口要求拍品已是 `BIDDING` | 后端接口问题 / 数据准备问题 | T14 先确认口径，必要时后端返工会话 |
| T13-BLOCK-004 | 阻塞级 | 前端真实 API read fallback 会把后端不可用或接口失败渲染为 mock 正常页面，不能支撑验收结论 | 前端接入问题 | T14 集成发布收口 |
| T13-MAJOR-001 | 重要级 | 当前后端验证以 service mock 单测为主，缺少跨模块真实 PostgreSQL HTTP E2E 覆盖 | 测试覆盖缺口 | T14 或独立 E2E 会话 |
| T13-MAJOR-002 | 重要级 | 敏感附件权限未在本轮主流程中通过 HTTP/E2E 验证 | 后端接口/测试覆盖缺口 | 文件权限返工或 E2E 会话 |
| T13-MAJOR-003 | 重要级 | 后台手动拉黑/解除拉黑、后台新建/编辑内容仍未完整前端真实接入 | 前端接入问题 | T14 或后续后台接入 |
| T13-OPT-001 | 后续优化级 | 驳回原因前端仍使用默认文案，未接弹窗输入 | 后续优化 | 后续体验优化 |
| T13-OPT-002 | 后续优化级 | 延时竞价结构化规则仍为暂缓范围 | 暂缓范围 | 暂不处理 |

### T14 Recommendation

建议启动 T14，但定位应是“带阻塞缺陷的集成收口/返工编排”，不是发布通过。T14 必须优先处理真实写接口接入、fallback 验收开关或网络失败显性化、`ANNOUNCING` -> `BIDDING` 口径确认，以及至少一条可重复执行的主流程 HTTP/DB 验收脚本。

## T14 Retest Record - 2026-05-17

### Main Flow Acceptance Update

| Step | Acceptance Result | Evidence |
|---|---|---|
| 管理员创建拍品草稿 | PASS | 前端新建/编辑拍品页接入 `POST /api/admin/lots`；`backend/test/e2e/main-flow-http-db.spec.ts` 通过 HTTP 创建拍品并断言状态 |
| 管理员提交发布复核 | PASS | 前端保存后可提交复核；E2E 调用 `POST /api/admin/lots/{id}/submit-review` |
| 复核通过进入公示 | PASS | E2E 调用 `POST /api/admin/reviews/lots/{id}/approve` 并断言 `ANNOUNCING` |
| 企业认证提交与审核通过 | PASS | 企业入驻页接入 `POST /api/enterprises/register`；E2E 覆盖两家企业提交和管理员审核 |
| 企业上传意向金凭证并审核通过 | PASS | 公告详情页接入 `POST /api/lots/{id}/deposit-vouchers`；E2E 覆盖两家企业凭证提交与审核通过 |
| 拍品进入竞拍期 | PASS | 新增 `POST /api/admin/lots/{id}/advance-to-bidding`，只允许 `ANNOUNCING` 且进入竞拍窗口的拍品推进到 `BIDDING`；`npm test -- lots` 和 E2E 均覆盖 |
| 有资格企业报价 | PASS | 竞价详情页接入 `POST /api/lots/{id}/bids`；E2E 覆盖非法报价拒绝和多次有效报价 |
| 竞拍结束生成成交结果和通知 | PASS | E2E 通过 DI 调用既有 `AuctionClosingService.closeEndedAuctions()`，验证后续成交结果可发布 |
| 发布成交公示 | PASS | E2E 调用 `POST /api/admin/results/{id}/publish` 并断言 `PUBLISHED` |
| 合同完成后进入门户数据看板统计 | PASS | E2E 调用合同签约和完成接口，并验证 `GET /api/portal/dashboard` 统计计入 |

### T14 Blocker Closure

| ID | Status | Evidence |
|---|---|---|
| T13-BLOCK-001 | CLOSED | 新增 `backend/test/e2e/main-flow-http-db.spec.ts`，执行命令 `npm test -- main-flow-http-db` |
| T13-BLOCK-002 | CLOSED | 前端关键写链路已接真实 API：新建/编辑拍品、企业入驻、意向金上传、报价提交 |
| T13-BLOCK-003 | CLOSED | 新增管理员显式推进接口 `POST /api/admin/lots/{id}/advance-to-bidding`，不改 schema |
| T13-BLOCK-004 | CLOSED | `VITE_ACCEPTANCE_MODE=true` 下禁用 mock fallback，真实 API 失败显性暴露 |

### Remaining Risk

- 竞拍结束仍由既有 `AuctionClosingService.closeEndedAuctions()` 处理，T14 E2E 通过 Nest DI 调用该服务；当前未新增 HTTP 触发接口或调度器。
- 敏感附件权限 HTTP/E2E 仍未纳入本条主流程脚本。
- 登录/JWT、内容新建/编辑、手动拉黑/解除拉黑、文件管理、操作日志仍是后续范围。

## T18 Retest Record - 2026-05-17

### Release Hardening Update

| Area | Acceptance Result | Evidence |
|---|---|---|
| 敏感附件权限 HTTP/DB | PASS | `npm test -- sensitive-files-http-db` 通过；覆盖企业资质、营业执照、意向金凭证，未授权企业访问 `GET /api/files/{id}` 返回 `FILE_FORBIDDEN`，所属企业和管理员可访问 |
| 竞拍结束处理可触达 | PASS | `npm test -- auction-closing-http-db` 通过；管理员调用 `POST /api/admin/auction-closing/run` 触发 `AuctionClosingService.closeEndedAuctions()` 并生成成交结果，企业角色访问被拒绝 |
| `advance-to-bidding` 正式口径 | PASS | 本阶段仍使用 `POST /api/admin/lots/{id}/advance-to-bidding` 将符合窗口条件的 `ANNOUNCING` 拍品推进为 `BIDDING` |
| 验收模式 | PASS | 发布说明保留 `VITE_ACCEPTANCE_MODE=true`，验收时真实 API 失败不得回退 mock |

### Remaining Non-Blocking Items

- 登录/JWT 未实现，当前仍为开发请求头模拟登录态。
- 结构化延时竞价暂不处理。
- 竞拍结束未引入复杂定时框架；发布建议为管理员手动触发或外部运维定时调用 `POST /api/admin/auction-closing/run`。

## T19 Release Review Record - 2026-05-17 22:22

### Verified Scope

| Area | Result | Evidence |
|---|---|---|
| T14 main flow HTTP/DB | PASS | 本轮 `npm test -- main-flow-http-db` 通过，`PASS test/e2e/main-flow-http-db.spec.ts`，1 个用例通过。 |
| T18 sensitive file HTTP/DB | PASS | 本轮 `npm test -- sensitive-files-http-db` 通过，`PASS test/e2e/sensitive-files-http-db.spec.ts`，1 个用例通过。 |
| T18 auction closing HTTP entry | PASS | 本轮 `npm test -- auction-closing-http-db` 通过，`PASS test/e2e/auction-closing-http-db.spec.ts`，1 个用例通过。 |
| Backend full gate | PASS | 本轮 `npm run lint`、`npm run typecheck`、`npm test` 通过；全量测试 19 suites / 66 tests passed。 |
| Frontend static gate | PASS | 本轮 `npm run lint` 与 `npm run build` 通过，Vite build 输出 `✓ built in 200ms`。 |
| Git whitespace gate | PASS_WITH_WARNINGS | 本轮 `git diff --check` 无 whitespace error，仅有 LF/CRLF warning。 |
| Worktree review | PASS_WITH_DIRTY_WORKTREE | 本轮 `git status --short` 可用，但工作区仍包含前序未提交/未跟踪文件和既有 `renzheng/*.png` 删除项。 |

### Release Readiness

- 可以进入提交/发布准备：T14 与 T18 的可执行验证脚本在本轮均通过，工程 gate 通过。
- 未实现事项仍需在发布说明保留：登录/JWT、结构化延时竞价、后台非主链路真实接入、内置定时框架。
- 发布验收必须设置 `VITE_ACCEPTANCE_MODE=true`，不能用 mock fallback 的页面正常展示作为真实接口通过证据。

## T26 Full Closure Review - 2026-05-18 08:36

### Main Flow Recheck

| Area | Result | Evidence |
|---|---|---|
| 主流程 HTTP/DB | PASS | `npm test -- main-flow-http-db` 顺序复跑通过，覆盖拍品、认证、意向金、竞价、成交、合同和看板链路。 |
| 敏感附件权限 HTTP/DB | PASS | `npm test -- sensitive-files-http-db` 顺序复跑通过，覆盖企业资质、营业执照、意向金凭证未授权访问拒绝。 |
| 竞拍结束 HTTP 入口 | PASS | `npm test -- auction-closing-http-db` 顺序复跑通过，覆盖管理员触发竞拍结束处理。 |
| 后端全量 gate | PASS | `npm run lint`、`npm run typecheck`、`npm test` 通过；22 suites / 77 tests。 |
| 前端静态 gate | PASS | `npm run lint`、`npm run build` 通过。 |

### Acceptance Notes

- 三条关键 E2E 使用同一测试数据库，不宜并行执行；本轮最终验收以顺序复跑通过为准。
- 当前可进入提交准备，但仍不等同于生产上线完成；登录/JWT、结构化延时竞价、内置定时框架仍需后续确认。

## T30 Real Runtime Click Acceptance - 2026-05-18 10:39

本轮启动当前源码后端 3100 与前端 5173 验收模式，进行真实浏览器点击验收。结论：工程 gate 与后端启动通过；门户、后台、企业中心点击跳转成立，但真实 API 加载未通过，不能标记 T30 通过。

| Area | Result | Evidence |
|---|---|---|
| Backend service | PASS | `PORT=3100; npm run start` 启动成功，`GET /api/health` 200。 |
| Frontend acceptance mode | PASS_WITH_BLOCKERS | `VITE_API_BASE_URL=http://127.0.0.1:3100/api`、`VITE_ACCEPTANCE_MODE=true` 下启动成功；真实 API 失败会报错，不回退为通过。 |
| Portal click paths | CLICK_PASS_API_BLOCKED | 覆盖首页、即将拍卖、正在竞价、成交公示、信息资讯；浏览器 API 请求被 CORS 拦截。 |
| Admin click paths | CLICK_PASS_API_BLOCKED | 覆盖后台看板、拍品管理、标的发布复核、操作日志；后台 API 请求因 CORS/OPTIONS 失败。 |
| Account click paths | CLICK_PASS_API_BLOCKED | 覆盖企业中心首页、我的企业认证、我的意向金、我的出价记录、我的通知；企业 API 请求因 CORS/OPTIONS 失败，且 seed 未提供可用企业用户 UUID。 |

### T30 Blockers

| ID | Issue | Evidence |
|---|---|---|
| T30-BLOCK-001 | 后端未启用 CORS/OPTIONS，前端使用绝对真实 API 地址时浏览器真实请求失败。 | 控制台报 `No 'Access-Control-Allow-Origin' header`；OPTIONS `/api/admin/logs?pageSize=100` 返回 404。 |
| T30-BLOCK-002 | 现有 seed 命令成功返回但未写入数据。 | seed 后只读计数仍为 `users=0,lots=0,enterprises=0,contents=0`。 |
| T30-BLOCK-003 | 拍品列表接口不接受前端当前 `pageSize=100` 字符串查询参数。 | `/api/lots?pageSize=100` 与 `/api/admin/lots?pageSize=100` 返回 400。 |
| T30-BLOCK-004 | 企业中心默认 `enterprise_demo` 不是可用用户 UUID。 | `/api/account/profile` with `x-user-id: enterprise_demo` 返回 500。 |

## T30 Full Runtime Click Recheck - 2026-05-18 11:37

T30A/T30B/T30C/T30D 完成后，本轮重新启动后端 3100 与前端 5173 验收模式复验。结论：T30 阻塞项在本轮复验中关闭，门户、后台、企业中心点击跳转与真实 API 加载同时成立。

| Area | Result | Evidence |
|---|---|---|
| Seed data | PASS | `npx prisma db seed` 通过，输出 `users=2, enterprises=1, lots=1, contents=4`。 |
| CORS / OPTIONS | PASS | `OPTIONS /api/admin/lots?pageSize=100` 返回 204，并允许 5173 origin 与 `x-user-id,x-user-role`。 |
| Public lots API | PASS | `GET /api/lots?pageSize=100` 返回 200。 |
| Admin lots API | PASS | ADMIN UUID 请求 `GET /api/admin/lots?pageSize=100` 返回 200。 |
| Account profile API | PASS | ENTERPRISE UUID 请求 `GET /api/account/profile` 返回 200。 |
| Portal click paths | PASS | 覆盖首页、即将拍卖、正在竞价、成交公示、信息资讯、公开说明；Playwright network 中门户关键 API 均为 200。 |
| Admin click paths | PASS | 覆盖后台看板、拍品管理、标的发布复核、操作日志；Playwright network 中后台关键 API 均为 200。 |
| Account click paths | PASS | 覆盖企业中心首页、我的企业认证、我的意向金、我的出价记录、我的通知；Playwright network 中企业端关键 API 均为 200。 |
| Console / network errors | PASS | Playwright `console error` 为 0；关键 API 未见 4xx/5xx 或 CORS 阻塞。 |
| Mock/fallback 判定 | PASS | 验收模式下未用页面可见 mock/fallback 内容作为通过依据，结论来自真实 HTTP 与 Playwright requests。 |

## T48 Final Manual Flow Acceptance - 2026-05-19 17:19

本轮只做最终验收和证据归档，不新增功能，不修改 Prisma schema，不修改业务代码。使用 T47 固定入口：后端 `http://127.0.0.1:3101`，前端 `http://127.0.0.1:5173`。

### Engineering Gate

| Command | Result | Evidence |
|---|---|---|
| `git status --short --branch` | PASS_WITH_DIRTY_WORKTREE | `main...origin/main [ahead 2]`；工作区包含 T45/T46/T47/T47B 等前序未提交改动，本轮只追加 T48 文档和证据。 |
| `Set-Location E:/kuangchan/backend; npm run lint` | PASS | ESLint completed without errors. |
| `Set-Location E:/kuangchan/backend; npm run typecheck` | PASS | `tsc --noEmit` completed without errors. |
| `Set-Location E:/kuangchan/backend; npm test` | PASS | 26 test suites / 91 tests passed. |
| `Set-Location E:/kuangchan/frontend; npm run lint` | PASS | ESLint completed without errors. |
| `Set-Location E:/kuangchan/frontend; npm run build` | PASS | TypeScript build and Vite production build completed. |
| `git diff -- backend/prisma/schema.prisma` | PASS | No output. |
| `git diff --check` | PASS_WITH_WARNINGS | No whitespace errors; only existing LF/CRLF warnings. |

### Browser Acceptance

| Area | Result | Evidence |
|---|---|---|
| Fixed entrypoints | PASS | Browser/API acceptance used backend `3101` and frontend `5173`; no temporary proxy. |
| Manual main flow | PASS | Primary evidence: `docs/qa/t48-artifacts/t48-manual-browser-report.json`; lot `6a60c2d4-364b-42d4-811b-c1f264da475d`, title `T48-MANUAL-20260519091748-人工口径验收标的`. |
| Admin lot publish | PASS | Admin browser login, lot edit page, real file inputs for images/report, submit review, lot review approval; screenshots `manual-01` through `manual-05`. |
| Public visibility | PASS | Portal home, `/resources`, `/announcements/upcoming`, and announcement detail showed the lot; screenshots `manual-06` through `manual-09`. |
| Deposit voucher flow | PASS | Enterprise uploaded deposit voucher from announcement detail; admin reviewed and approved it from `/admin/reviews/deposits`; screenshots `manual-10` and `manual-11`. |
| Bidding flow | PASS | Admin advanced lot to bidding from `/admin/lots`; enterprise entered `/auctions/live/detail`, saw countdown and submitted bid; screenshots `manual-12` through `manual-15`. |
| Closing and result | PASS | Admin-triggered HTTP entry `POST /api/admin/auction-closing/run` returned `closedLots=1`; admin results page published generated result; screenshot `manual-16`. |
| Winning notice and signing | PASS | Enterprise saw winning message and `/account/winning-detail`; admin contract page marked signed; screenshots `manual-17` through `manual-21`. |
| Tail payment and completion | PASS | Enterprise page showed tail payment instructions after signed state; admin confirmed offline tail payment/completed through contract page; enterprise saw `已完成确认`; screenshots `manual-21` through `manual-24`. |
| Dashboard / result / contract consistency | PASS | Final API consistency: result `已公示`, contract `已完成`, lot `已完成`, dashboard totals `3` / `330`; screenshots `manual-25` through `manual-27`. |
| Console and network | PASS | `consoleErrorCount=0`, failed requests `0` in `t48-manual-browser-report.json`. |
| 390px coverage | PASS | Covered home, login, announcement detail, auction detail, admin dashboard, admin contracts, enterprise winning detail; all `documentScrollWidth=390`, `bodyScrollWidth=390`. |
| Additional API-assisted evidence | PASS | `docs/qa/t48-artifacts/t48-browser-report.json` also records a second full pass for lot `fae3b802-07b5-43b2-ade8-58a1728570d1`, console error `0`, failed requests `0`, width failures `0`. |

### Release Gap List

| ID | Severity | Status | Detail |
|---|---|---|---|
| T48-GAP-001 | Non-blocking | OPEN | 竞拍结拍没有前端页面按钮；本轮按既有正式入口以管理员 Bearer 调用 `POST /api/admin/auction-closing/run`，符合“管理员触发结拍或等待结束”的验收口径。 |
| T48-GAP-002 | Non-blocking | OPEN | 本地 `backend/.env` 仍包含 `PORT=3000`；T48 使用已运行的固定 `3101` 服务并在记录中保留 T47 建议，后续启动需显式设置/确认 `PORT=3101`。 |
| T48-GAP-003 | Non-blocking | OPEN | 当前工作树仍混有前序未提交差异；发布提交时需精确 stage，避免混入 `.tmp/`、Stitch 源目录或无关历史改动。 |

### T48 Conclusion

T48 主流程最终人工口径验收通过；未发现发布阻塞级 BLOCKER。以上结论以本轮新鲜命令输出、`t48-manual-browser-report.json`、`t48-browser-report.json` 和 `docs/qa/t48-artifacts/*.png` 截图为准。
