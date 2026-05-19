# 华宁矿产竞拍平台前后端接入清单

## 0. 第一阶段接入状态

- [x] `frontend/src/services/api.ts` 已增加真实 API 适配，默认请求 `/api`，可通过 `VITE_API_BASE_URL` 覆盖。
- [x] T47 后推荐本地入口固定为后端 `127.0.0.1:3101`、前端 `127.0.0.1:5173`；Vite dev server 将 `/api/**` 原样代理到后端，不截断 `/api`。
- [x] 门户首页数据看板优先读取 `GET /api/portal/dashboard`。
- [x] 门户拍品列表、拍品详情、公开出价记录、成交公示、资讯/公开说明优先读取真实 API。
- [x] 个人中心 profile、意向金、出价、消息和标记已读优先读取企业端真实 API。
- [x] 后台拍品、审核、交易、内容、通知列表优先读取真实 API。
- [x] 后台低风险状态流转按钮已接入真实 API，失败时保留当前页面状态并给出可见提示。
- [x] 前端已补轻量导航方法，门户顶栏、后台侧栏、企业中心菜单和关键按钮可通过页面点击切换到已有路由。
- [x] 后台新建/编辑拍品已接入 `POST /api/admin/lots` 与 `PUT /api/admin/lots/{id}`，可保存草稿或保存后提交复核。
- [x] 后台新建/编辑内容已接入 `POST /api/admin/contents` 与 `PUT /api/admin/contents/{id}`，保存失败时显性提示。
- [x] 后端已提供 `POST /api/files/upload`，管理员可上传拍品图片与检测报告并获得可回填 `fileUrl`。
- [x] 后台新建/编辑拍品页已接入真实上传：图一、图二、检测报告均可选择本机文件，上传成功后回填对应 URL 字段。
- [x] 后端已提供 `POST /api/auth/login` 与 `POST /api/auth/logout`；受保护接口支持 `Authorization: Bearer <accessToken>`。
- [x] 企业入驻提交已接入 `POST /api/enterprises/register`。
- [x] 意向金上传已接入 `POST /api/lots/{id}/deposit-vouchers`。
- [x] 竞价报价提交已接入 `POST /api/lots/{id}/bids`。
- [x] 后台拍品列表可调用 `POST /api/admin/lots/{id}/advance-to-bidding` 将符合时间窗口的公示中拍品推进为竞拍中。
- [x] 管理员可调用 `POST /api/admin/auction-closing/run` 触发竞拍结束处理。
- [x] 敏感附件可通过 `GET /api/files/{id}` 按权限访问，未授权企业访问返回 `FILE_FORBIDDEN`。
- [x] 开发浏览默认仍可 fallback 避免白屏；验收模式 `VITE_ACCEPTANCE_MODE=true` 下真实 API 失败会显性抛错，不回退 mock。
- [x] 文件管理、操作日志页面已优先读取 `GET /api/admin/files` 与 `GET /api/admin/logs`。

## 1. 前端工程

- 工程目录：`frontend`
- 技术栈：React + TypeScript + Vite
- 当前数据来源：门户与个人中心优先调用真实 API，失败时回退 `frontend/src/data/mock.ts`。
- 验收模式：设置 `VITE_ACCEPTANCE_MODE=true` 后，`withFallback` 不再回退 mock，真实 API 失败会直接暴露。
- 接口替换点：`frontend/src/services/api.ts` 同时保留同步 mock 方法和异步真实 API 方法，后台列表页优先调用 `fetchAdmin*` 方法。
- 生产认证口径：受保护接口优先使用 `Authorization: Bearer <accessToken>`；`accessToken` 由 `POST /api/auth/login` 返回。
- 开发请求头口径：`x-user-id` 必须使用用户 UUID，不使用 username；`x-user-role` 使用 `ADMIN` 或 `ENTERPRISE`。该口径仅用于本地开发和历史联调脚本，生产路径不得依赖，且默认关闭。
- 开发请求头开关：后端必须设置 `DEV_AUTH_HEADERS_ENABLED=true` 才接受开发头；前端必须设置 `VITE_DEV_AUTH_HEADERS_ENABLED=true` 才会在无 token 时发送开发头。
- 企业端开发请求头：仅在 `VITE_DEV_AUTH_HEADERS_ENABLED=true` 且无 token 时发送 `x-user-role: ENTERPRISE`，`x-user-id` 默认取 `localStorage.devEnterpriseUserId`，其次取 `VITE_DEV_ENTERPRISE_USER_ID`，最后回退 ENTERPRISE 用户 UUID `714ac6d2-aa76-4cff-9224-ecae6298c599`。
- 管理端开发请求头：仅在 `VITE_DEV_AUTH_HEADERS_ENABLED=true` 且无 token 时发送 `x-user-role: ADMIN`，`x-user-id` 默认取 `localStorage.devAdminUserId`，其次取 `VITE_DEV_ADMIN_USER_ID`，最后回退 ADMIN 用户 UUID `0d3ed994-8ebf-47ec-bf11-2eb86f008ae6`。

## 2. 页面路由清单

### PC 门户

| 页面 | 路由 | 主要数据 |
|---|---|---|
| PC 门户首页 | `/` | 数据看板、即将拍卖、正在竞价、成交公示 |
| 矿产资源列表页 | `/resources` | `GET /api/lots` 映射的矿产资源/拍品列表 |
| 矿产资源详情页 | `/resources/detail` | `GET /api/lots/{id}` 映射的资源详情 |
| 即将拍卖公告列表页 | `/announcements/upcoming` | 公示中拍品列表 |
| 即将拍卖公告详情页 | `/announcements/upcoming/detail` | 拍品详情、客户须知、竞拍规则、保证金说明、意向金状态 |
| 正在竞价标的列表页 | `/auctions/live` | 竞拍中拍品列表、当前最高价、倒计时 |
| 竞价详情页 | `/auctions/live/detail` | 拍品详情、竞价资格、当前最高价、出价记录 |
| 成交公示列表页 | `/results` | 成交公示列表 |
| 成交公示详情页 | `/results/detail` | 单个成交结果 |
| 信息资讯列表页 | `/news` | 政策法规、交易公告、矿能动态 |
| 信息资讯详情页 | `/news/detail` | 资讯正文 |
| 公开说明页 | `/disclosures` | 黑名单说明、审核机制、竞拍规则、保证金说明 |
| 企业登录页 | `/login` | 登录表单 |
| 企业入驻页 | `/enterprise/register` | 企业认证提交表单 |

### PC 管理后台

| 页面 | 路由 | 主要数据 |
|---|---|---|
| 后台首页/数据看板 | `/admin/dashboard` | 成交统计、审核待办、最近日志 |
| 拍品管理列表页 | `/admin/lots` | 拍品列表、状态流转 |
| 新建/编辑拍品页 | `/admin/lots/edit` | 拍品表单、竞价配置、附件 |
| 全流程操作进度页 | `/admin/lots/progress` | 现有拍品、成交、合同数据推导节点展示，页面标注“根据当前业务状态生成” |
| 标的发布复核页 | `/admin/reviews/lots` | 待复核拍品、通过/驳回 |
| 企业认证审核页 | `/admin/reviews/enterprises` | 企业认证资料、通过/驳回 |
| 意向金凭证审核页 | `/admin/reviews/deposits` | 付款凭证、竞价资格审核 |
| 竞价记录管理页 | `/admin/bids` | 出价记录 |
| 成交结果管理页 | `/admin/results` | 成交结果、公示状态 |
| 合同状态管理页 | `/admin/contracts` | 合同状态：待签约、已签约、已完成、违约 |
| 退款状态管理页 | `/admin/refunds` | 退款状态：未退款、审核中、已退款 |
| 黑名单管理页 | `/admin/blacklist` | 拉黑、解除拉黑 |
| 内容管理页 | `/admin/content` | 资讯与公开说明内容 |
| 通知管理页 | `/admin/notifications` | 成交通知、失败通知发送记录 |
| 文件管理页 | `/admin/files` | 拍品图片、检测报告、营业执照、付款凭证等 |
| 操作日志页 | `/admin/logs` | 关键操作留痕 |

### 企业用户中心

| 页面 | 路由 | 主要数据 |
|---|---|---|
| 企业用户中心首页 | `/account` | 企业认证状态、意向金、出价、通知概览 |
| 我的企业认证页 | `/account/certification` | 本企业认证资料、驳回原因 |
| 我的意向金页 | `/account/deposits` | 本企业意向金凭证记录 |
| 我的出价记录页 | `/account/bids` | 本企业出价记录 |
| 我的通知页 | `/account/messages` | 站内通知 |
| 中标后办理详情页 | `/account/winning-detail` | `GET /api/results` / `GET /api/account/bids` 生成线下签约、尾款说明和完成确认进度 |

## 3. 建议后端接口

### 认证与用户

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/account/profile`
- `POST /api/enterprises/register`
- `GET /api/account/certification`
- `PUT /api/account/certification`

### 拍品与门户

- `GET /api/portal/dashboard`：已接入，首页数据看板真实优先。
- `GET /api/lots`：已接入，门户拍品列表真实优先。
- `GET /api/lots/{id}`：已接入，详情页支持 `?id=`，缺失时回退第一条数据。
- `/resources` 与 `/resources/detail` 复用 `GET /api/lots` / `GET /api/lots/{id}` 映射展示矿产资源，不新增专用资源接口。
- `GET /api/lots/{id}/attachments`
- `GET /api/lots/{id}/bid-records`：已接入，竞价详情出价记录真实优先，继续展示脱敏企业名称。
- `POST /api/lots/{id}/deposit-vouchers`
- `POST /api/lots/{id}/deposit-vouchers`：已接入，公告详情页上传意向金凭证失败时显性提示。
- `POST /api/lots/{id}/bids`：已接入，竞价详情页确认出价失败时显性提示。

### 后台拍品与审核

- `GET /api/admin/lots`：已接入，后台拍品列表真实优先。
- `POST /api/admin/lots`
- `POST /api/admin/lots`：已接入，新建/编辑拍品页可保存草稿。
- `PUT /api/admin/lots/{id}`：已接入，URL 带 `?id=` 时编辑指定拍品。
- `POST /api/admin/lots/{id}/submit-review`：已接入，失败时提示且不改本地状态。
- `POST /api/admin/lots/{id}/advance-to-bidding`：已接入，作为 `公示中` 到 `竞拍中` 的显式推进口径。
- `POST /api/admin/lots/{id}/close`：已接入，失败时提示且不改本地状态。
- `GET /api/admin/reviews/lots`：已接入，兼容后端数组响应。
- `POST /api/admin/reviews/lots/{id}/approve`：已接入。
- `POST /api/admin/reviews/lots/{id}/reject`：已接入，当前使用页面默认驳回原因。
- `GET /api/admin/reviews/enterprises`：已接入，兼容后端数组响应。
- `POST /api/admin/reviews/enterprises/{id}/approve`：已接入。
- `POST /api/admin/reviews/enterprises/{id}/reject`：已接入，当前使用页面默认驳回原因。
- `GET /api/admin/reviews/deposits`：已接入，兼容后端数组响应；后端返回 `enterpriseName`、`lotTitle` 并保留 `enterpriseId`、`lotId`，页面优先展示名称，缺失时回退 ID。
- `POST /api/admin/reviews/deposits/{id}/approve`：已接入。
- `POST /api/admin/reviews/deposits/{id}/reject`：已接入，当前使用页面默认驳回原因。

### 交易、成交、合同、退款

- `GET /api/admin/bids`：已接入，后台出价记录真实优先。
- `GET /api/results`：已接入，成交公示列表/详情真实优先。
- `GET /api/results/{id}`
- `GET /api/admin/results`：已接入，后台成交结果真实优先。
- `POST /api/admin/results/{id}/publish`：已接入。
- `GET /api/admin/contracts`：已接入。
- `POST /api/admin/contracts/{id}/mark-signed`：已接入。
- `POST /api/admin/contracts/{id}/mark-completed`：已接入。
- `POST /api/admin/contracts/{id}/mark-defaulted`：已接入。
- T46B 线下签约与尾款确认不新增后端支付能力；后台合同页“确认尾款已线下支付并完成”继续复用 `mark-completed`，前端二次确认系统仅记录管理员线下核验结果。
- `GET /api/admin/refunds`：已接入。
- `POST /api/admin/refunds/{id}/mark-reviewing`：已接入。
- `POST /api/admin/refunds/{id}/mark-refunded`：已接入。

### 企业管理、内容、通知、文件、日志

- `GET /api/admin/blacklist`：已接入。
- `POST /api/admin/blacklist`：已接入，黑名单页表单提交企业 ID、拍品 ID 与拉黑原因，失败时不改列表状态。
- `POST /api/admin/blacklist/{id}/release`：已接入，行操作成功后刷新列表，失败时保留当前页面状态。
- `GET /api/contents`：已接入，资讯与公开说明真实优先。
- `GET /api/contents/{id}`
- `GET /api/admin/contents`：已接入。
- `POST /api/admin/contents`
- `PUT /api/admin/contents/{id}`
- `POST /api/admin/contents/{id}/publish`：已接入。
- `POST /api/admin/contents/{id}/unpublish`：已接入。
- `GET /api/admin/notifications`：已接入。
- `GET /api/account/profile`：已接入，个人中心企业状态真实优先。
- `GET /api/account/deposit-vouchers`：已接入，我的意向金真实优先；T45 后端已补 `attachmentId`、`voucherFileName`、`voucherFileUrl`，前端可直接展示并打开已上传付款凭证。
- `GET /api/account/bids`：已接入，我的出价真实优先，仅显示当前企业接口返回数据。
- `GET /api/account/messages`：已接入，我的通知真实优先，仅显示当前企业接口返回数据。
- `POST /api/account/messages/{id}/read`：已接入，标记已读失败时回退本地 mock 状态。
- `GET /api/admin/files`：已接入，文件管理页真实优先。
- `POST /api/files/upload`：已接入后台拍品表单；请求为 `multipart/form-data`，文件字段 `file`，`category` 支持 `LOT_IMAGE`、`INSPECTION_REPORT`，返回 `id/fileName/fileUrl/mimeType/fileSize/category/isSensitive`。前端会将返回 `fileUrl` 解析为后端绝对 URL 后回填 `imageOneUrl`、`imageTwoUrl`、`inspectionReportUrl`，以兼容拍品保存接口的 URL 校验。
- `GET /api/files/content/{id}`：后端已提供；通过附件权限校验后返回上传文件内容，可作为上传响应中的 `fileUrl` 访问。
- `GET /api/files/{id}`：已接入后端权限控制；敏感附件仅允许管理员、上传用户或附件所属企业用户访问。
- `GET /api/admin/logs`：已接入，操作日志页真实优先；后台首页最近操作日志暂保留 mock。

### 竞拍结束运维入口

- `POST /api/admin/auction-closing/run`：已接入后端轻量触发入口，管理员调用后执行 `AuctionClosingService.closeEndedAuctions()`，返回 `checkedLots`、`closedLots`、`endedWithoutBids`、`skippedLots`。

## 6. Fallback 策略

- 所有本阶段新增真实请求都通过 `withFallback` 包装；网络错误、非 2xx 响应、后端未启动、开发认证头无效都会回退 mock。
- `VITE_ACCEPTANCE_MODE=true` 时禁用 `withFallback` 的 mock 回退，真实 API 失败会直接抛错，用于发布验收和联调复测。
- `api.ts` 继续保留 `getStats/getLots/getDeposits/...` 同步 mock 方法，避免尚未接入的后台页面被异步改造影响。
- 门户详情页优先使用 URL 查询参数 `?id=` 获取详情；没有参数或真实接口失败时回退 mock 第一条记录。
- 个人中心和后台接口优先使用 Bearer 登录态；无 token 时默认不发送开发头。只有显式设置 `VITE_DEV_AUTH_HEADERS_ENABLED=true` 时，前端才发送开发请求头用于本地开发和历史联调脚本。
- 401 会清理登录态；401/403 不回退 mock，避免把认证或权限失败误判为通过。
- 后台列表页初始显示 mock，挂载后尝试真实 API；接口失败时保留 mock 并显示页面提示，不白屏。
- 后台状态流转按钮直接调用后端接口；成功后触发当前列表刷新，失败时弹出可见提示并保持当前页面状态。

## 7. 未接入后台接口

- 后台新建拍品、编辑拍品已接入真实写接口。
- 后台新建内容、编辑内容已接入真实写接口。
- 后台文件管理、操作日志页已接入真实只读接口；后台首页最近操作日志暂保留 mock 数据。
- 后端认证登录/JWT 与前端 Bearer 登录态已实现；企业入驻提交、意向金上传、出价提交已完成真实写接口接入。

## 11. T21C 文件管理与操作日志缺口盘点

- `GET /api/admin/files`：未实现。当前后端文件模块只提供 `GET /api/files/{id}` 单附件权限访问，未发现后台文件管理列表 controller。
- `GET /api/admin/logs`：未实现。当前 `backend/src/logging/**` 只包含 `OperationLogService` logger 记录能力，未发现后台操作日志列表 controller。
- 前端文件管理页 `/admin/files`：未接真实接口，`FileManagementPage` 仅使用 `api.getFiles()`，数据来自 `frontend/src/data/mock.ts`。
- 前端操作日志页 `/admin/logs`：未接真实接口，`OperationLogPage` 仅使用 `api.getLogs()`，数据来自 `frontend/src/data/mock.ts`；后台首页最近操作日志同样直接使用 `api.getLogs()`。
- 待确认：后台文件列表字段是否以 `Attachment` 为基线并聚合来源业务显示名；操作日志是否要求数据库持久化后再提供列表接口。
- 下一步最小建议：先补两个管理员只读列表接口，再让前端页面增加 `loadRows` 接入真实 API，保留现有 mock fallback 与验收模式策略。

## 12. T24 文件管理与操作日志前端真实接入

- T23 后端已提供 `GET /api/admin/files` 与 `GET /api/admin/logs` 管理员只读列表。
- 前端新增 `fetchAdminFiles()` 与 `fetchAdminLogs()`，均携带开发期管理员请求头并沿用 `withFallback` 策略。
- 文件管理页 `/admin/files` 已增加 `loadRows`，优先读取真实接口，开发失败时保留 mock 并显示 notice。
- 操作日志页 `/admin/logs` 已增加 `loadRows`，优先读取真实接口，开发失败时保留 mock 并显示 notice。
- `VITE_ACCEPTANCE_MODE=true` 下，真实接口失败会继续抛出错误，不会被页面级 fallback 重新判定为 mock 成功。
- 后台首页最近操作日志暂保留 mock，避免扩大本轮改动范围。

## 13. T25 操作日志写入持久化

- `OperationLogService.record()` 已写入现有 `operation_logs` 表，并保留现有业务调用方传入中文动作与 `targetType:targetId` 字符串的兼容口径。
- `GET /api/admin/logs` 继续读取 `operation_logs`，现在可查到业务操作产生的记录。
- 本轮未修改 Prisma schema，未新增字段 diff、审计报表或复杂筛选。

## 14. T29 前端导航联通

- 新增轻量前端导航方法，使用 `history.pushState`、自定义导航事件和 `popstate` 监听驱动 `App.tsx` 重新渲染，不引入路由框架。
- 门户顶栏已接通：首页、即将拍卖、正在竞价、成交公示、信息资讯、公开说明、登录、企业入驻；“矿产资源”暂映射到即将拍卖列表。
- 后台侧栏已接通：首页看板、拍品管理、审核管理、交易管理、企业管理、内容运营、系统审计；分组入口映射到该分组下已有默认页面。
- 企业中心菜单已接通：中心首页、我的企业认证、我的意向金、我的出价记录、我的通知。
- 关键按钮已接通：查看更多、查看公告、进入竞价、查看详情、返回列表、返回首页、新建拍品、取消等。
- 详情跳转优先携带 `?id=`；当当前行没有可用拍品 ID 时，前端会尝试用拍品标题匹配本地拍品列表，仍无法匹配时跳到对应详情默认页。

## 15. T47 推荐本地运行入口

- 推荐后端端口：`3101`。默认启动命令：`Set-Location E:/kuangchan/backend; npm run start`；如需显式指定：`$env:PORT='3101'; npm run start`。
- 推荐前端端口：`5173`。默认启动命令：`Set-Location E:/kuangchan/frontend; npm run dev`。
- 前端开发入口：`http://127.0.0.1:5173/`，企业登录页 `http://127.0.0.1:5173/login`，后台登录页 `http://127.0.0.1:5173/admin/login`。
- 本地默认 API：前端请求同源 `/api`，由 `frontend/vite.config.ts` 代理到 `http://127.0.0.1:3101`，路径 `/api/**` 保持不变。
- 验收登录账号：管理员 `admin / admin123456`，企业 `enterprise_demo / enterprise123456`。
- 正式验收推荐不设置 `DEV_AUTH_HEADERS_ENABLED` 或 `VITE_DEV_AUTH_HEADERS_ENABLED`，只验证 Bearer JWT。
- 如需历史开发头联调，后端设置 `DEV_AUTH_HEADERS_ENABLED=true`，前端设置 `VITE_DEV_AUTH_HEADERS_ENABLED=true`；该模式不得作为生产验收口径。

## 15. T30 真实运行点击联调

- 后端当前源码推荐在 `PORT=3101` 启动，`GET /api/health` 返回 200。
- 前端当前推荐使用 `http://127.0.0.1:5173` 与同源 `/api` 代理启动；`VITE_API_BASE_URL` 仅保留为兼容覆盖项。
- T30A 已启用开发 CORS/OPTIONS，允许 `x-user-id` 与 `x-user-role` 通过预检。
- T30B 已修复 seed 开发数据，并确认 ADMIN/ENTERPRISE 用户 UUID 可用。
- T30C 已修复 `/api/lots?pageSize=100` 与 `/api/admin/lots?pageSize=100` 查询参数数字转换。
- T30D 已同步开发认证用户 UUID 口径：前端默认开发请求头不再使用 `admin_demo` 或 `enterprise_demo` username。
- 2026-05-18 11:37 已重跑 T30 全链路真实运行点击复验：seed 数据存在，`/api/lots?pageSize=100`、`/api/admin/lots?pageSize=100`、`/api/account/profile` 均返回 200；门户、后台、企业中心关键点击路径均触发真实 API 200，Playwright `console error` 为 0。
- 本轮验收模式未把 mock/fallback 展示记为真实 API 通过；结论以 curl 与 Playwright network requests 为准。

## 16. T35 竞价详情页视觉复刻

- 已读取 Stitch MCP 项目 `16913530871577335378` 中真实 screen `c5c73f7f64b74dc08447639efabfdd8d`（标题：竞价详情页），并按其布局复刻竞价详情页。
- `/auctions/live/detail` 无 `?id=` 时，前端先读取真实 `/api/lots?pageSize=100` 选择可用真实拍品，再加载详情和 `/api/lots/{id}/bid-records?pageSize=100`，避免用 mock lotId 触发真实 API 失败。
- 出价操作区继续沿用 T34 口径：选择“出价加价次数”，前端计算 `当前最高价/起拍价 + 次数 × 加价幅度` 后提交现有 `{ amount }`。
- Playwright 桌面截图：`docs/qa/t35-auction-detail-desktop.png`；移动端补充截图：`docs/qa/t35-auction-detail-mobile.png`。
- Playwright 390px 宽度检查：`documentElement.scrollWidth=390`、`innerWidth=390`，未出现页面级横向溢出。

## 17. T36 Stitch 全站复刻盘点

- 已读取本地 Stitch 源目录 `stitch_document_to_webpage_generator/`，以 `_1` 至 `_36` 的 `code.html`、`pc/code.html`、`stitch_frontend_page_prompts.md` 和 `institutional_integrity/DESIGN.md` 为盘点依据。
- 完整页面映射与后续分批计划见 `docs/qa/stitch-full-replication-plan.md`。
- 当前 T35 仅覆盖 `/auctions/live/detail` 竞价详情页；其余门户、后台、企业中心页面仍需后续 T37/T38 分批复刻。
- 当前 React 路由缺少 Stitch 提示词中的矿产资源列表/详情和后台登录页；是否新增 `/resources`、`/resources/detail`、`/admin/login` 需总控确认。
- `stitch_document_to_webpage_generator/` 当前建议作为本地参考源，不整体纳入提交；如需入库，建议先去重并由总控确认提交范围。

## 18. T37A 门户通用组件与首页 Stitch 复刻

- 已基于 `stitch_document_to_webpage_generator/_22/code.html`、`pc/code.html` 与 `institutional_integrity/DESIGN.md` 复刻门户公共头部、首页和页脚。
- 首页改为 Stitch 主版结构：顶部政务导航、四个数据看板卡片、左侧正在竞价卡片与矿产资源表、右侧即将拍卖公告/成交公示/信息资讯列表、深蓝页脚。
- 真实 API 接入保持不变：`fetchStats()`、`fetchLots()`、`fetchResults()`、`fetchContents()` 继续优先读取真实接口，失败策略仍由既有 `withFallback` 控制。
- 门户导航行为保持不变；本轮未新增 `/resources` 路由，顶部“矿产资源”和首页资源区“查看全部”仍按 T29/T36 口径跳转到 `/announcements/upcoming`。
- Playwright 截图：`docs/qa/t37-artifacts/t37a-portal-home-desktop.png`、`docs/qa/t37-artifacts/t37a-portal-home-mobile.png`。
- Playwright 390px 宽度检查：`documentElement.scrollWidth=390`、`innerWidth=390`，未出现页面级横向溢出；`console error` 为 0。

## 19. T37B 门户列表与普通详情页 Stitch 复刻

- 已基于 `stitch_document_to_webpage_generator/_18/code.html`、`_27/code.html`、`_34/code.html`、`_26/code.html`、`_31/code.html`，并参考 T36 中 `_21/_20/_7` 映射，复刻门户普通列表与详情页面。
- 复刻范围：即将拍卖列表/详情、正在竞价列表、成交公示列表/详情、信息资讯列表/详情、公开说明页。
- 本轮仅改 `frontend/src/pages/PortalPages.tsx` 与 `frontend/src/index.css` 的门户普通页结构和样式；未改后端、Prisma schema、登录/JWT、T34 出价口径，也未重复重写 T37A 门户头部、首页、页脚。
- 真实 API 与 fallback 策略保持不变：列表页继续使用 `fetchLots()`、`fetchResults()`、`fetchContents()`；公告详情无 `?id=` 时先取真实列表中可用公示拍品，避免 mock id 请求真实详情接口产生 console error。
- Playwright 390px 宽度检查覆盖 `/announcements/upcoming`、`/announcements/upcoming/detail`、`/auctions/live`、`/results`、`/results/detail`、`/news`、`/news/detail`、`/disclosures`，结果均为 `scrollWidth=390`、`innerWidth=390`、`overflow=false`；逐页 `console error` 为 0。
- Playwright 截图保存到 `docs/qa/t37-artifacts/`，文件名前缀为 `t37b-`。

## 20. T37C 门户登录、企业入驻、资源页决策

- 已基于 `stitch_document_to_webpage_generator/_35/code.html` 与 `_35/screen.png` 复刻 `/login` 企业登录页视觉；本轮仅保留当前开发期按钮导航到 `/account`，不实施登录/JWT 生产化。
- 已基于 `stitch_document_to_webpage_generator/_29/code.html` 复刻 `/enterprise/register` 企业入驻页视觉：流程步骤、分组表单、附件上传卡与底部操作栏；`POST /api/enterprises/register` 真实提交和 fallback 口径保持不变。
- 资源页决策：本轮不新增 `/resources`、`/resources/detail`。原因是当前允许修改范围不包含 `frontend/src/App.tsx`，且 Stitch 本地目录只有矿产资源列表/详情提示词、没有对应已生成 HTML；门户“矿产资源”入口继续沿用 T37A/T29 口径映射到 `/announcements/upcoming` 与现有拍品数据。
- 本轮未修改后端、Prisma schema、登录/JWT、T34 出价口径，未提交 `stitch_document_to_webpage_generator/`、`.playwright-cli/` 或 `frontend/.playwright-cli/`。
- Playwright 390px 宽度检查覆盖 `/login` 与 `/enterprise/register`，结果均为 `scrollWidth=390`、`innerWidth=390`、`overflow=false`；两页 `console error` 为 0。
- Playwright 截图保存到 `docs/qa/t37-artifacts/`，文件名前缀为 `t37c-`。

## 21. T38A 后台通用组件与核心拍品/审核页面 Stitch 复刻

- 已基于 `stitch_document_to_webpage_generator/_17/code.html`、`_9/code.html`、`_4/code.html`、`_16/code.html`、`_6/code.html`、`_5/code.html` 复刻后台首页、拍品列表、新建/编辑拍品、标的发布复核、企业认证审核、意向金凭证审核的主要视觉。
- 后台框架改为 Stitch 风格深色侧栏、顶部面包屑、待办卡片、数据看板、筛选卡片、高密度表格和右侧详情抽屉视觉位；后台表格分页和筛选区域补齐更接近 Stitch 的管理端密度。
- 真实 API 行为保持不变：后台列表继续优先调用 `fetchAdminLots()`、`fetchAdminLotReviews()`、`fetchAdminEnterpriseReviews()`、`fetchAdminDepositReviews()`；状态操作继续调用既有审核/流转接口，失败时保留当前页面状态并提示；开发失败仍按既有 mock fallback 策略处理。
- 本轮未修改后端、Prisma schema、登录/JWT、T34 出价口径，也未引入本地上传业务能力；新建/编辑拍品页的上传卡仅为视觉占位，真实本地上传仍留给 T32。
- Playwright 覆盖 `/admin/dashboard`、`/admin/lots`、`/admin/lots/edit`、`/admin/reviews/lots`、`/admin/reviews/enterprises`、`/admin/reviews/deposits`：逐页 `console error` 为 0；390px 检查均为 `scrollWidth=390`、`innerWidth=390`、`overflow=false`。
- Playwright 截图保存到 `docs/qa/t38-artifacts/`，文件名前缀为 `t38a-`。

## 22. T32A 后端真实文件上传接口

- 后端新增 `POST /api/files/upload`，管理员使用开发认证头上传本机文件，当前覆盖拍品图片 `LOT_IMAGE` 与检测报告 `INSPECTION_REPORT`。
- 上传响应返回 `id`、`fileName`、`fileUrl`、`mimeType`、`fileSize`、`category`、`isSensitive`；`fileUrl` 形如 `/api/files/content/{id}`，可回填后台拍品表单。
- 新增 `GET /api/files/content/{id}` 返回本地上传文件内容，并复用既有附件权限校验；既有 `GET /api/files/{id}` 元数据权限接口不变。
- `GET /api/admin/files` 继续聚合 `Attachment`，本次新上传的文件会出现在后台文件管理列表。
- 上传文件保存到 `backend/tmp/uploads/`，命中既有 `tmp/` 忽略规则；本轮未修改 Prisma schema。

## 23. T32B 前端拍品表单真实上传接入

- `/admin/lots/edit` 的拍品图一、拍品图二、检测报告上传卡已从 T38A 视觉占位改为真实文件选择控件。
- 三个入口分别调用 `POST /api/files/upload`：图一/图二使用 `category=LOT_IMAGE` 且限制 JPG/PNG；检测报告使用 `category=INSPECTION_REPORT` 且限制 PDF。
- 上传失败会在页面 notice 中显性提示，并保留原 URL 字段值，不生成伪成功 URL。
- 上传成功后将后端响应 `fileUrl` 解析为后端绝对 URL，回填 `imageOneUrl`、`imageTwoUrl`、`inspectionReportUrl`，现有 `createLot`/`updateLot` payload 和保存/提交复核流程保持不变。
- Playwright 验证中三次上传请求均返回 201；保存草稿 `POST /api/admin/lots` 返回 201，保存并提交复核链路 `POST /api/admin/lots` 与 `POST /api/admin/lots/{id}/submit-review` 均返回 201。
- Playwright 390px 宽度检查 `/admin/lots/edit` 返回 `scrollWidth=390`、`innerWidth=390`、`overflow=false`；`console error` 为 0。

## 24. T37D PC 首页最新 Stitch 智能交互版替换收口

- 已优先读取 Stitch MCP 项目 `16913530871577335378` 中 screen `6de9c056dd3c45c291a22c0c53293642`，标题为“华宁矿产 - 智能交互门户首页”，并以该屏幕作为本轮首页收口来源。
- `/` 首页当前替换为最新智能交互门户结构：深色首屏、搜索入口、四个数据看板、正在竞价主卡、服务入口、即将拍卖/政策资讯/成交公示侧栏列表。
- 真实 API 接入保持不变：`fetchStats()`、`fetchLots()`、`fetchResults()`、`fetchContents()` 继续优先读取真实接口；本轮未改后端、Prisma schema、登录/JWT、T32 上传或 T38 后台视觉。
- 首页导航行为保持不变：搜索与公示、竞价、企业中心、资讯、成交公示入口继续调用既有 `navigateTo` 路径，不新增路由。
- 截图留存目录：`docs/qa/stitch-latest-home/`；必提交截图为 `latest-home-reference.png`、`latest-home-react-desktop-pw.png`、`latest-home-react-mobile-pw.png`。

## 25. T38C 企业中心页面 Stitch 复刻

- 已基于本地 Stitch 源 `stitch_document_to_webpage_generator/_8`、`_32`、`_2`、`_19`、`_12`、`_24` 复刻企业中心首页、我的企业认证、我的意向金、我的出价记录、我的通知。
- 企业中心布局改为 Stitch 风格：白底政务顶栏下的 240px 企业侧栏、企业状态卡、待办摘要、浅灰内容区、筛选卡片、高密度表格和通知阅读态卡片。
- 真实 API 接入保持不变：`fetchAccountProfile()`、`fetchAccountDeposits()`、`fetchAccountBids()`、`fetchAccountMessages()`、`markMessageRead()` 继续由页面调用。
- 企业端开发请求头口径保持不变：`x-user-role: ENTERPRISE`，默认企业 UUID 仍为 `714ac6d2-aa76-4cff-9224-ecae6298c599`。
- 本轮未修改后端、Prisma schema、登录/JWT、T32 上传接口/上传口径，也未修改 `stitch_document_to_webpage_generator/`、`.playwright-cli/` 或 `frontend/.playwright-cli/`。
- Playwright 覆盖 `/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages`：逐页 `console error` 为 0；390px 检查均为 `innerWidth=390`、`documentElement.scrollWidth=390`、`body.scrollWidth=390`、`overflow=false`。
- Playwright 截图保存到 `docs/qa/t38-artifacts/`，文件名前缀为 `t38c-`。

## 26. T38B 后台交易、企业管理、内容运营、系统审计页面 Stitch 复刻

- 已基于本地 Stitch 源 `_25`、`_28`、`_33`、`_15`、`_11`、`_10`、`_36`、`_1` 和提示词 4.8，复刻 `/admin/bids`、`/admin/results`、`/admin/contracts`、`/admin/refunds`、`/admin/blacklist`、`/admin/content`、`/admin/notifications`、`/admin/files`、`/admin/logs`。
- T38B 页面延续 T38A 深色后台侧栏、顶部面包屑、筛选区、高密度表格和右侧详情抽屉，并补充交易摘要卡、内容分类树、文件/通知/日志详情列表、成交/合同/退款/黑名单高风险确认视觉。
- 真实 API 接入保持不变：`fetchAdminBids()`、`fetchAdminResults()`、`fetchAdminContracts()`、`fetchAdminRefunds()`、`fetchAdminBlacklist()`、`fetchAdminContents()`、`fetchAdminNotifications()`、`fetchAdminFiles()`、`fetchAdminLogs()` 继续由页面调用。
- 状态操作保持不变：发布成交结果、合同签约/完成/违约、退款审核中/已退款、黑名单拉黑/解除、内容发布/下架/保存仍调用既有 `api.ts` 方法；失败时沿用页面现有提示与不改本地状态口径。
- 本轮未修改后端、Prisma schema、登录/JWT、T32 上传接口/上传口径，也未修改 T38C `AccountPages.tsx`、T37D `PortalPages.tsx` 或 `stitch_document_to_webpage_generator/`。
- Playwright 覆盖 9 个 T38B 路由：逐页 `console error` 为 0；390px 检查均为 `innerWidth=390`、`documentElement.scrollWidth=390`、`body.scrollWidth=390`、`overflow=false`。
- Playwright 截图保存到 `docs/qa/t38-artifacts/`，文件名前缀为 `t38b-`，包含黑名单高风险确认视觉截图 `t38b-admin-blacklist-modal-desktop.png`。

## 27. T40 门户登录状态与竞价报价体验修复

- `/login` 的“立即登录”在 T33 前写入前端开发态会话标记 `localStorage.portalEnterpriseLoggedIn=true`，并触发页面内会话刷新；这不是生产 JWT 登录。
- 门户头部在会话标记存在时显示企业入口、认证状态与“退出”，企业入口跳转 `/account`，退出会清除前端会话标记并回到 `/`。
- 竞价详情页会识别当前展示拍品是否为真实 API 拍品；URL id 命中本地 mock 或 API fallback 时，报价区提示“当前为本地演示数据，不能提交真实报价，请从正在竞价列表进入真实拍品。”并禁用刷新/确认出价。
- 本轮未修改 `frontend/src/services/api.ts`，真实拍品仍沿用 `fetchLot()`、`fetchBidRecords()`、`submitBid()` 和既有开发认证请求头。
- 加价次数输入框已支持手动输入正整数；空值、0、负数、小数、非数字不作为有效次数，blur 时归一为 1；`+` / `-` 保留且最低为 1。

## 28. T33A 后端登录/JWT 与认证守卫生产化

- 后端新增 `POST /api/auth/login`，使用 `username/password` 登录，成功返回 `accessToken`、`user` 与 `profile`。
- 后端新增最小 `POST /api/auth/logout`，携带有效 Bearer JWT 后返回成功；服务端当前不维护 session 黑名单，不强制令牌失效。
- `AuthGuard` 已支持 `Authorization: Bearer <accessToken>`，并保持 `CurrentUser` 为 `{ id, role }`。
- 受保护接口认证优先级：Bearer JWT 优先，开发头 `x-user-id` / `x-user-role` 仅作为本地开发 fallback 保留。
- 后端实时校验 token 对应用户、角色、状态和企业绑定：用户不存在/token 无效返回 401；用户禁用、企业不存在、角色不满足接口要求返回 403；角色变化返回 401 要求重新登录。
- Seed 开发账号密码：`admin / admin123456`，`enterprise_demo / enterprise123456`。本轮未修改 Prisma schema。

## 29. T33B 前端登录态与 Bearer 请求接入

- `/login` 已接入真实 `POST /api/auth/login`，提交字段仅包含 `username/password`；验证码为前端本地算术校验，不改后端 DTO。
- 登录成功后保存 `localStorage.huaningAuthToken` 与 `localStorage.huaningAuthProfile`；门户头部、企业中心侧栏和后台侧栏均读取真实 profile/token，不再依赖 T40 的 `portalEnterpriseLoggedIn`。
- `frontend/src/services/api.ts` 请求层统一在存在 token 时注入 `Authorization: Bearer <token>`；无 token 时才保留 `x-user-id` / `x-user-role` 本地开发 fallback。
- `POST /api/auth/logout` 已接入；退出请求失败也会清理本地 token/profile，并恢复未登录头部与受保护页面拦截。
- 受保护企业端/管理端真实请求遇到 401 会清理登录态；401/403 不再回退 mock，页面显示重新登录或无权限提示。
- 角色保护：`ENTERPRISE` 可访问 `/account` 与竞价/凭证流程，`ADMIN` 可访问 `/admin`；管理员访问企业中心、企业访问管理端均显示明确拦截。
- 竞价详情保留 T40 的真实拍品识别；本轮增加企业角色校验，管理员或未登录用户不能提交企业报价，mock 详情仍禁止报价。
- Playwright 验证使用生产构建静态服务同源 `/api` 反代到 `127.0.0.1:3101`；跨源 Vite 直连 `3101` 会受当前后端 CORS 限制，不作为本轮代码阻塞。

## 30. T41 前端全流程可操作性修复

- `/admin/lots/edit` 时间字段已改为 `datetime-local`：截止日期、公示开始/结束、竞拍开始/结束均展示本地 24 小时制时间；保存时仍转换为 ISO 字符串提交现有接口。
- `/admin/lots/edit` 金额字段已增加实时大额单位提示：单价/起拍价、评估价、保证金金额、加价幅度不改变字段值，仅在输入旁展示如 `100 万元`、`1.2 亿元`。
- 提交复核按钮已增加 loading/disabled，成功显示“提交成功，已进入发布复核”，随后返回 `/admin/lots`；失败时显示后端错误，不改本地状态。
- 公告详情页意向金凭证已改为真实文件选择：企业选择 JPG/PNG/PDF 后调用 `POST /api/files/upload`，取得 `fileUrl/fileName` 后再调用 `POST /api/lots/{id}/deposit-vouchers`；成功显示“凭证已提交，等待管理员审核”。
- 后端文件上传白名单最小补充 `DEPOSIT_VOUCHER`，并限制企业账号只能上传该分类；Prisma schema 未修改。
- 竞价详情页根据真实拍品 `biddingEndAt` 实时展示“剩余 HH:mm:ss”或“剩余 N天 HH:mm:ss”，到期显示“已结束/等待系统结拍”并禁用确认出价。
- mock/演示拍品详情不会发真实上传或报价请求，页面会提示从真实列表进入；390px 首页、公告详情、竞价详情、后台编辑页复核无横向溢出。

## 31. T42 人工主流程导航与审核待办体验优化

- 公告详情页“意向金资格”卡已补四步流程：企业认证、缴纳意向金、平台审核、竞价资格；上传或刷新已有凭证后会显示“已提交，等待管理员审核”并提供“查看我的意向金”“重新上传凭证”。
- 公告详情页会读取 `/api/account/deposit-vouchers` 中当前企业对应拍品的凭证状态，刷新页面后仍能展示待审核/审核通过/审核驳回状态。
- `/account/deposits` 已增加待审核下一步提示、凭证文件列、应缴/实缴金额展示，并保留返回对应拍品详情入口。
- 后台首页“待办审核”改为真实聚合 `GET /api/admin/reviews/lots`、`GET /api/admin/reviews/enterprises`、`GET /api/admin/reviews/deposits`，接口失败显示“待办加载失败，请刷新”，不静默 mock 为 0。
- 后台侧边栏“审核管理”下直接显示“拍品发布审核 / 企业认证审核 / 意向金凭证审核”，待审核数量以角标展示，意向金入口跳转 `/admin/reviews/deposits`。
- `/admin/reviews/deposits` 标题明确为“意向金凭证审核”，默认状态为待审核，支持企业名称、拍品标题、项目编号/拍品 ID 搜索和状态筛选。
- 意向金审核通过/驳回、拍品发布审核通过/驳回成功后会显示下一步按钮：继续审核、返回待办、去拍品列表等；企业报价成功后显示“查看我的出价记录 / 刷新当前价”。

## 32. T43C 企业中心全量 Stitch 复刻与凭证流程联动

- 已基于本地 Stitch 源 `_8`、`_32`、`_2`、`_19`、`_12`、`_24` 强化企业中心五个页面：`/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages`。
- `/account` 首页继续突出认证状态、待处理意向金、进行中竞价、未读通知，并将近期意向金/出价/通知与真实企业端接口联动。
- `/account/certification` 新增真实读取 `GET /api/account/certification`，显示企业认证资料、提交/审核时间、状态、驳回原因和重新提交入口；接口失败时沿用既有显性错误提示。
- `/account/deposits` 保留 T41/T42 上传凭证后的下一步提示，并补充待审核/已通过/需处理摘要；T45 后端企业列表已返回 `voucherFileName/voucherFileUrl/attachmentId`，前端可显示真实“查看凭证”链接，老接口或异常数据下仍保留“待后端返回附件链接”兼容提示。
- `/account/bids` 补充出价记录、当前最高价、进行中竞价摘要，表格继续展示加价次数、当前最高价、竞价状态与详情入口。
- `/account/messages` 合并 `_12/_24` 风格，支持全部/未读/已读筛选、查看详情、标记已读和全部标记已读；标记已读继续调用 `POST /api/account/messages/{id}/read`。
- Bearer 登录态和企业角色拦截保持既有口径：请求层仍优先注入 `Authorization: Bearer <token>`，`AccountLayout` 继续拦截非企业身份。
- 浏览器验收使用当前源码后端 `http://127.0.0.1:3123/api` 与同源静态代理 `http://127.0.0.1:5182/`；跨源 Vite 直连会被后端 CORS 拦截，不作为真实登录验收口径。
- Playwright 覆盖企业账号 `enterprise_demo / enterprise123456` 登录、五个企业中心页面访问、意向金上传后 `/account/deposits` 可见记录、390px 无横向溢出、console error=0。
- 截图与浏览器结果保存到 `docs/qa/t43-artifacts/`，本轮账户页文件名前缀为 `t43-account-`，浏览器结果为 `t43-browser-result.json`。

## 32. T43B 后台全量 Stitch 页面复刻与后台登录页补齐

- 已读取本地 Stitch 后台源 `_17`、`_9`、`_4`、`_16`、`_6`、`_5`、`_25`、`_28`、`_33`、`_15`、`_11`、`_10`、`_36`、`_1` 以及提示词 4.1。
- 后台核心与交易/企业/内容/审计页面沿用 T38A/T38B 已复刻结构；本轮重点补齐缺失 `/admin/login`。
- 新增 `/admin/login` 管理员登录页：政务业务系统深蓝安全视觉、管理员账号/密码/验证码、登录失败/验证码错误/提交中提示；成功且角色为 `ADMIN` 后跳转 `/admin/dashboard`。
- 后台未登录或非管理员访问时，“去登录”改为进入 `/admin/login`；企业中心守卫仍进入 `/login`。
- 真实 API 行为保持不变：后台登录复用 `POST /api/auth/login`，不修改后端 Auth/JWT；后台列表和状态操作继续调用既有 `api.ts` 方法。
- 后台首页保留 Stitch 风格待办卡：待发布复核、待企业认证审核、待意向金凭证审核；侧栏“审核管理”下直接显示“意向金凭证审核”入口。
- `/admin/lots/edit` 保留 T41 的 `datetime-local`、大额单位提示、真实上传、提交复核成功反馈。
- Playwright 覆盖 `/admin/login` 真登录以及 15 个后台路由；`admin/admin123456` 登录成功；390px 检查均为 `innerWidth=390`、`documentElement.scrollWidth=390`、`body.scrollWidth=390`、`overflow=false`；`console error` 为 0。
- 截图与报告保存到 `docs/qa/t43-artifacts/`，后台验证报告为 `t43-playwright-report.json`。

## 33. T43D Stitch 全量复刻总体验收与缺口归档

- 本轮只做总体验收与文档归档，不改业务代码、不改 `backend/prisma/schema.prisma`、不提交 `stitch_document_to_webpage_generator/`。
- 已按 `Get-ChildItem stitch_document_to_webpage_generator -Recurse -Filter code.html` 盘点到 41 个 `code.html`；其中 7 个首页重复源 SHA256 完全一致，归并为一个参考组。
- 路由基线以 `frontend/src/App.tsx` 与 `frontend/src/routes.ts` 为准：门户 14 条、后台 16 条、企业中心 5 条均已存在，新增 `/resources`、`/resources/detail`、`/admin/login` 均可路由。
- 首页主次口径：`_14/code.html` 作为当前 `/` 智能交互门户首页主来源；`_3/code.html` 与 `_13/code.html` 作为首页视觉探索参考；`_22/_23/pc/huaning_mineral_auction_platform_1-4` 为相同 hash 的旧首页重复组，只归并为首页数据区块、矿产资源表与资源页参考。

### T43D Stitch 全量映射表

| # | Stitch 源 | 判定 | React 路由/归并结果 | 截图/验证资产 |
|---:|---|---|---|---|
| 1 | `_1/code.html` | 操作日志 | `/admin/logs` | `t43-admin-logs-desktop.png`、`t43-admin-logs-mobile.png` |
| 2 | `_2/code.html` | 我的意向金 | `/account/deposits` | `t43-account-deposits-desktop.png`、`t43-account-deposits-mobile.png` |
| 3 | `_3/code.html` | 首页变体参考 | 归并到 `/`，仅作 `_14` 首页主结构的视觉参考 | `t43-home-390.png` |
| 4 | `_4/code.html` | 新建/编辑拍品 | `/admin/lots/edit` | `t43-admin-lots-edit-desktop.png`、`t43-admin-lots-edit-mobile.png` |
| 5 | `_5/code.html` | 意向金凭证审核 | `/admin/reviews/deposits` | `t43-admin-reviews-deposits-desktop.png`、`t43-admin-reviews-deposits-mobile.png` |
| 6 | `_6/code.html` | 企业认证审核 | `/admin/reviews/enterprises` | `t43-admin-reviews-enterprises-desktop.png`、`t43-admin-reviews-enterprises-mobile.png` |
| 7 | `_7/code.html` | 公开说明 | `/disclosures` | `t43-disclosures-390.png` |
| 8 | `_8/code.html` | 企业中心首页 | `/account` | `t43-account-home-desktop.png`、`t43-account-home-mobile.png` |
| 9 | `_9/code.html` | 拍品管理 | `/admin/lots` | `t43-admin-lots-desktop.png`、`t43-admin-lots-mobile.png` |
| 10 | `_10/code.html` | 通知管理 | `/admin/notifications` | `t43-admin-notifications-desktop.png`、`t43-admin-notifications-mobile.png` |
| 11 | `_11/code.html` | 内容管理 | `/admin/content` | `t43-admin-content-desktop.png`、`t43-admin-content-mobile.png` |
| 12 | `_12/code.html` | 我的通知版本 A | 归并到 `/account/messages`，与 `_24` 合并为消息列表/详情体验 | `t43-account-messages-desktop.png`、`t43-account-messages-mobile.png` |
| 13 | `_13/code.html` | 首页变体参考 | 归并到 `/`，仅作 `_14` 首页主结构的视觉参考 | `t43-home-390.png` |
| 14 | `_14/code.html` | 首页主来源 | `/` | `t43-home-390.png` |
| 15 | `_15/code.html` | 黑名单管理 | `/admin/blacklist` | `t43-admin-blacklist-desktop.png`、`t43-admin-blacklist-mobile.png` |
| 16 | `_16/code.html` | 标的发布复核 | `/admin/reviews/lots` | `t43-admin-reviews-lots-desktop.png`、`t43-admin-reviews-lots-mobile.png` |
| 17 | `_17/code.html` | 后台首页/数据看板 | `/admin/dashboard` | `t43-admin-dashboard-desktop.png`、`t43-admin-dashboard-mobile.png` |
| 18 | `_18/code.html` | 即将拍卖公告列表 | `/announcements/upcoming` | `t43-upcoming-390.png` |
| 19 | `_19/code.html` | 我的出价记录 | `/account/bids` | `t43-account-bids-desktop.png`、`t43-account-bids-mobile.png` |
| 20 | `_20/code.html` | 信息资讯详情 | `/news/detail` | `t43-news-detail-390.png` |
| 21 | `_21/code.html` | 信息资讯列表 | `/news` | `t43-news-390.png` |
| 22 | `_22/code.html` | 旧首页重复组主参考 | 归并到 `/`；矿产资源区也作为 `/resources` 参考 | `t43-home-390.png`、`t43-resources-390.png` |
| 23 | `_23/code.html` | 旧首页重复 | 与 `_22` hash 相同，归并为重复首页参考，不设独立路由 | `t43-home-390.png` |
| 24 | `_24/code.html` | 我的通知版本 B | 归并到 `/account/messages`，与 `_12` 合并 | `t43-account-messages-desktop.png`、`t43-account-messages-mobile.png` |
| 25 | `_25/code.html` | 成交结果管理 | `/admin/results` | `t43-admin-results-desktop.png`、`t43-admin-results-mobile.png` |
| 26 | `_26/code.html` | 成交公示列表 | `/results` | `t43-results-390.png` |
| 27 | `_27/code.html` | 即将拍卖公告详情 | `/announcements/upcoming/detail` | `t43-upcoming-detail-390.png` |
| 28 | `_28/code.html` | 合同状态管理 | `/admin/contracts` | `t43-admin-contracts-desktop.png`、`t43-admin-contracts-mobile.png` |
| 29 | `_29/code.html` | 企业入驻 | `/enterprise/register` | `t43-enterprise-register-390.png` |
| 30 | `_30/code.html` | 竞价详情 | `/auctions/live/detail`；资源详情借鉴其矿区图文/附件表达 | `t43-live-auction-detail-390.png`、`t43-resources-detail-390.png` |
| 31 | `_31/code.html` | 成交公示详情 | `/results/detail` | `t43-result-detail-390.png` |
| 32 | `_32/code.html` | 我的企业认证 | `/account/certification` | `t43-account-certification-desktop.png`、`t43-account-certification-mobile.png` |
| 33 | `_33/code.html` | 退款状态管理 | `/admin/refunds` | `t43-admin-refunds-desktop.png`、`t43-admin-refunds-mobile.png` |
| 34 | `_34/code.html` | 正在竞价列表 | `/auctions/live` | `t43-live-auctions-390.png` |
| 35 | `_35/code.html` | 企业登录 | `/login` | `t43-login-390.png` |
| 36 | `_36/code.html` | 文件管理 | `/admin/files` | `t43-admin-files-desktop.png`、`t43-admin-files-mobile.png` |
| 37 | `pc/code.html` | 旧首页重复 | 与 `_22` hash 相同，归并为重复首页参考，不设独立路由 | `t43-home-390.png` |
| 38 | `huaning_mineral_auction_platform_1/code.html` | 旧首页重复 | 与 `_22` hash 相同，归并为重复首页参考，不设独立路由 | `t43-home-390.png` |
| 39 | `huaning_mineral_auction_platform_2/code.html` | 旧首页重复 | 与 `_22` hash 相同，归并为重复首页参考，不设独立路由 | `t43-home-390.png` |
| 40 | `huaning_mineral_auction_platform_3/code.html` | 旧首页重复 | 与 `_22` hash 相同，归并为重复首页参考，不设独立路由 | `t43-home-390.png` |
| 41 | `huaning_mineral_auction_platform_4/code.html` | 旧首页重复 | 与 `_22` hash 相同，归并为重复首页参考，不设独立路由 | `t43-home-390.png` |

### T43D 路由与截图结论

- 门户路由已覆盖：`/`、`/resources`、`/resources/detail`、`/announcements/upcoming`、`/announcements/upcoming/detail`、`/auctions/live`、`/auctions/live/detail`、`/results`、`/results/detail`、`/news`、`/news/detail`、`/disclosures`、`/login`、`/enterprise/register`。
- 后台路由已覆盖：`/admin/login`、`/admin/dashboard`、`/admin/lots`、`/admin/lots/edit`、`/admin/reviews/lots`、`/admin/reviews/enterprises`、`/admin/reviews/deposits`、`/admin/bids`、`/admin/results`、`/admin/contracts`、`/admin/refunds`、`/admin/blacklist`、`/admin/content`、`/admin/notifications`、`/admin/files`、`/admin/logs`。
- 企业中心路由已覆盖：`/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages`。
- 已检查 `docs/qa/t43-artifacts/`：门户 14 条 390px 截图、后台 15 条桌面/移动截图、后台登录截图、企业中心 5 条桌面/移动截图、`t43-playwright-summary.json`、`t43-playwright-report.json`、`t43-browser-result.json` 均存在。

## 34. T44 提交范围整理与任务状态校准

- 状态校准：`docs/agent-handoff.md` 的 `2026-05-19 11:17 - T33C 权限回归与完整主流程人工验收` 记录已覆盖账号密码验证码登录、Bearer 权限回归、错角色拦截、拍品发布审核、凭证上传审核、竞拍、成交、签约/完成确认、企业中心状态、数据看板和 390px 验收；因此 `T33C=DONE`、`T33=DONE`。尾款支付、签约地址仍按该记录保留为 PARTIAL/GAP。
- 建议提交批次一：T33A 后端 JWT。应 stage `backend/prisma/seed.ts`、`backend/src/auth/auth.controller.ts`、`backend/src/auth/auth.service.ts`、`backend/src/auth/dto/login.dto.ts`、`backend/src/auth/jwt.service.ts`、`backend/src/auth/password.service.ts`、`backend/src/auth/auth.guard.ts`、`backend/src/auth/auth.module.ts`、`backend/src/auth/roles.guard.ts`、`backend/src/common/errors/app-exception.filter.ts`、`backend/src/common/errors/error-codes.ts`，以及 `docs/api-contract.md`、`docs/frontend-backend-integration-checklist.md`、`docs/task-board.md`、`docs/agent-handoff.md` 中对应 T33A/T33A 复核 hunks。
- 建议提交批次二：T33B 前端 Bearer 登录态。应 stage `frontend/src/services/auth.ts`、`frontend/src/services/api.ts`、`frontend/src/pages/PortalPages.tsx`、`frontend/src/components/Layouts.tsx`、`frontend/src/pages/AccountPages.tsx`、`frontend/src/pages/AdminPages.tsx`、`frontend/src/index.css` 中 T33B 相关 hunks，以及上述文档中的 T33B/T33B 复核 hunks。因这些前端文件后续又被 T41/T42/T43 修改，建议用 `git add -p` 分 hunk stage。
- 建议提交批次三：T41/T42 主流程体验。应 stage `backend/src/files/files.controller.ts`、`backend/src/files/files.service.ts`、`backend/test/files/files.service.spec.ts` 中 `DEPOSIT_VOUCHER` 上传白名单/测试 hunks；stage `frontend/src/pages/AdminPages.tsx`、`frontend/src/pages/PortalPages.tsx`、`frontend/src/pages/AccountPages.tsx`、`frontend/src/components/Layouts.tsx`、`frontend/src/services/api.ts`、`frontend/src/index.css` 中后台拍品表单、公告详情凭证、倒计时、待办审核、意向金审核入口和下一步反馈 hunks；stage 文档中的 T41/T42 hunks。
- 建议提交批次四：T43 Stitch 全量复刻。应 stage `frontend/src/App.tsx`、`frontend/src/routes.ts`、`frontend/src/pages/PortalPages.tsx`、`frontend/src/pages/AdminPages.tsx`、`frontend/src/pages/AccountPages.tsx`、`frontend/src/components/Layouts.tsx`、`frontend/src/services/api.ts`、`frontend/src/index.css` 中 T43A/T43B/T43C 相关 hunks；stage `docs/qa/t43-artifacts/` 中确认资产文件；stage 文档中的 T43A/T43B/T43C/T43D hunks。
- `docs/qa/t43-artifacts/` 可提交资产：`t43-*.png` 截图中除 `t43-login-debug.png` 外的门户、后台、企业中心截图；`t43-playwright-summary.json`、`t43-playwright-report.json`、`t43-browser-result.json`、`t43d-smoke-result.json` 验收报告。
- `docs/qa/t43-artifacts/` 临时脚本/日志/夹具：`t43-portal-check.cjs`、`t43-static-proxy.cjs`、`t43-preview-*.log`、`t43-preview-*.err.log`、`t43-static-proxy-*.log`、`t43-static-proxy-*.err.log`、`t43-voucher-fixture.pdf`，建议不提交；`t43-login-debug.png` 属调试截图，建议不提交。
- 必须排除：`backend/prisma/schema.prisma`、`stitch_document_to_webpage_generator/`、`docs/qa/stitch-latest-home/latest-home-react-desktop.png`、`docs/qa/stitch-latest-home/latest-home-react-mobile.png`、上述 T43 临时脚本/日志/夹具/调试截图，以及任何 `.tmp/`、本地服务日志或未确认截图。
- 当前混合工作树中 `docs/api-contract.md` 只有既有 T33A 契约差异，本轮 T44 不修改；提交时仍应按 T33A 批次处理。

## 35. T46A 通用状态组件 Stitch 规范落地

- 新增 `frontend/src/components/StatusViews.tsx`，提供 `TableSkeleton`、`CardSkeleton`、`EmptyState`、`ErrorState`、`ForbiddenState`、`LoginRequiredState`、`PendingReviewState`。
- 视觉来源为用户提供的 Stitch `_4`“平台统一交互状态规范”HTML，以及本地 `stitch_document_to_webpage_generator (1)/stitch_document_to_webpage_generator/_4/screen.png`；本地该 `_4` 目录仅有 `screen.png`，未发现 `code.html`。
- `DataTable` 空数据统一使用 `EmptyState`，保留分页和表格结构，不改变数据加载契约。
- 守卫接入：未登录访问 `/account` 使用 `LoginRequiredState`；企业身份访问 `/admin/dashboard` 使用 `ForbiddenState`；后台未登录仍跳 `/admin/login`。
- 后台接入：后台首页待办加载中使用 `TableSkeleton`，待办加载失败使用 `ErrorState`；后台通用列表和意向金凭证审核列表在 401/403 时使用统一失败状态，普通接口不可用仍保留既有 mock fallback 口径。
- 企业中心接入：`/account/certification` 在企业认证 `待审核` 时使用 `PendingReviewState`；通知、概览小列表空状态使用统一 `EmptyState`。
- 门户接入：`/resources` 与 `/auctions/live` 空列表使用统一 `EmptyState`；不扩大到所有门户页面重构。
- 浏览器验证资产保存到 `docs/qa/t46-artifacts/`：`t46-browser-report.json` 及 390px 截图，覆盖未登录、无权限、审核中、门户空数据状态。

## 36. T46B 线下签约与尾款确认 Stitch 流程补齐

- 企业端新增 `/account/winning-detail`，复用公开成交、企业出价和企业 profile 数据展示中标拍品、成交价、中标企业、成交时间、合同状态、线下签约地址/时间/联系人/材料和尾款付款说明。
- 后台合同状态管理页保留 `GET /api/admin/contracts` 和三个既有状态 POST，强化右侧“合同与尾款确认详情”抽屉，并将完成按钮文案调整为“确认尾款已线下支付并完成”。
- 完成按钮点击前弹出二次确认：“系统不处理线上资金，仅记录管理员已核验线下尾款支付凭证，请确认是否继续？”。
- 后台新增 `/admin/lots/progress`，读取现有拍品、成交和合同数据生成拍品创建、发布复核、公示中、意向金提交、意向金审核、竞价中、竞价结束、成交公示、线下签约、尾款确认、完成节点；页面明确标注节点为“根据当前业务状态生成”。
- 成交公示详情与企业成交通知增加“查看办理详情”入口；系统仍不做线上支付或第三方支付，不修改 Prisma schema。
