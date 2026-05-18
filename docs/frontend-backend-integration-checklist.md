# 华宁矿产竞拍平台前后端接入清单

## 0. 第一阶段接入状态

- [x] `frontend/src/services/api.ts` 已增加真实 API 适配，默认请求 `/api`，可通过 `VITE_API_BASE_URL` 覆盖。
- [x] 门户首页数据看板优先读取 `GET /api/portal/dashboard`。
- [x] 门户拍品列表、拍品详情、公开出价记录、成交公示、资讯/公开说明优先读取真实 API。
- [x] 个人中心 profile、意向金、出价、消息和标记已读优先读取企业端真实 API。
- [x] 后台拍品、审核、交易、内容、通知列表优先读取真实 API。
- [x] 后台低风险状态流转按钮已接入真实 API，失败时保留当前页面状态并给出可见提示。
- [x] 前端已补轻量导航方法，门户顶栏、后台侧栏、企业中心菜单和关键按钮可通过页面点击切换到已有路由。
- [x] 后台新建/编辑拍品已接入 `POST /api/admin/lots` 与 `PUT /api/admin/lots/{id}`，可保存草稿或保存后提交复核。
- [x] 后台新建/编辑内容已接入 `POST /api/admin/contents` 与 `PUT /api/admin/contents/{id}`，保存失败时显性提示。
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
- 企业端开发请求头：个人中心接口会带 `x-user-role: ENTERPRISE`，`x-user-id` 默认取 `localStorage.devEnterpriseUserId`，其次取 `VITE_DEV_ENTERPRISE_USER_ID`，最后回退 `enterprise_demo`。
- 管理端开发请求头：后台接口会带 `x-user-role: ADMIN`，`x-user-id` 默认取 `localStorage.devAdminUserId`，其次取 `VITE_DEV_ADMIN_USER_ID`，最后回退 `admin_demo`。

## 2. 页面路由清单

### PC 门户

| 页面 | 路由 | 主要数据 |
|---|---|---|
| PC 门户首页 | `/` | 数据看板、即将拍卖、正在竞价、成交公示 |
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
- `GET /api/account/deposit-vouchers`：已接入，我的意向金真实优先，仅显示当前企业接口返回数据。
- `GET /api/account/bids`：已接入，我的出价真实优先，仅显示当前企业接口返回数据。
- `GET /api/account/messages`：已接入，我的通知真实优先，仅显示当前企业接口返回数据。
- `POST /api/account/messages/{id}/read`：已接入，标记已读失败时回退本地 mock 状态。
- `GET /api/admin/files`：已接入，文件管理页真实优先。
- `GET /api/files/{id}`：已接入后端权限控制；敏感附件仅允许管理员、上传用户或附件所属企业用户访问。
- `GET /api/admin/logs`：已接入，操作日志页真实优先；后台首页最近操作日志暂保留 mock。

### 竞拍结束运维入口

- `POST /api/admin/auction-closing/run`：已接入后端轻量触发入口，管理员调用后执行 `AuctionClosingService.closeEndedAuctions()`，返回 `checkedLots`、`closedLots`、`endedWithoutBids`、`skippedLots`。

## 6. Fallback 策略

- 所有本阶段新增真实请求都通过 `withFallback` 包装；网络错误、非 2xx 响应、后端未启动、开发认证头无效都会回退 mock。
- `VITE_ACCEPTANCE_MODE=true` 时禁用 `withFallback` 的 mock 回退，真实 API 失败会直接抛错，用于发布验收和联调复测。
- `api.ts` 继续保留 `getStats/getLots/getDeposits/...` 同步 mock 方法，避免尚未接入的后台页面被异步改造影响。
- 门户详情页优先使用 URL 查询参数 `?id=` 获取详情；没有参数或真实接口失败时回退 mock 第一条记录。
- 个人中心接口使用开发请求头模拟企业用户；真实登录/JWT 不在本阶段范围内。
- 后台列表页初始显示 mock，挂载后尝试真实 API；接口失败时保留 mock 并显示页面提示，不白屏。
- 后台状态流转按钮直接调用后端接口；成功后触发当前列表刷新，失败时弹出可见提示并保持当前页面状态。

## 7. 未接入后台接口

- 后台新建拍品、编辑拍品已接入真实写接口。
- 后台新建内容、编辑内容已接入真实写接口。
- 后台文件管理、操作日志页已接入真实只读接口；后台首页最近操作日志暂保留 mock 数据。
- 认证登录仍未实现；企业入驻提交、意向金上传、出价提交已完成真实写接口接入。

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

## 15. T30 真实运行点击联调

- 后端当前源码可在 `PORT=3100` 启动，`GET /api/health` 返回 200。
- 前端可在 `VITE_API_BASE_URL=http://127.0.0.1:3100/api`、`VITE_ACCEPTANCE_MODE=true` 下启动。
- 浏览器真实联调当前被 CORS/OPTIONS 阻塞：后端未返回 `Access-Control-Allow-Origin`，带开发认证头的后台/企业请求会触发预检并失败。
- `GET /api/lots?pageSize=100` 与 `GET /api/admin/lots?pageSize=100` 当前返回 400；前端列表请求使用该参数格式，真实加载会失败。
- `npx prisma db seed` 本轮退出码为 0，但未写入用户、企业、拍品、内容等数据；因此没有可用于企业中心验收的企业用户 UUID。
- T30 当前结论：点击跳转成立，但“点击跳转 + 真实 API 加载”未同时成立；不得把 mock/fallback 页面展示记为通过。

## 9. T14 收口记录

- T14 复测口径：前端关键写链路不再只是静态/mock；验收模式下 fallback 显性失败；`公示中` 到 `竞拍中` 通过管理员显式接口 `POST /api/admin/lots/{id}/advance-to-bidding` 完成。
- 主流程 HTTP/DB 验收脚本：`Set-Location E:/kuangchan/backend; npm test -- main-flow-http-db`。
- 脚本覆盖：后台创建拍品、提交复核、发布复核通过、企业入驻、企业审核、意向金上传与审核、推进竞拍、非法报价拒绝、有效报价、竞拍结束成交、发布成交公示、合同签约/完成、门户看板统计。

## 10. T18 发布前补强记录

- 敏感附件权限 HTTP/DB 验证：`Set-Location E:/kuangchan/backend; npm test -- sensitive-files-http-db`。
- 竞拍结束 HTTP 触发验证：`Set-Location E:/kuangchan/backend; npm test -- auction-closing-http-db`。
- `advance-to-bidding` 正式口径保持不变：`POST /api/admin/lots/{id}/advance-to-bidding` 是本阶段 `公示中` 到 `竞拍中` 的显式推进方式。
- 发布验收模式保持不变：前端需设置 `VITE_ACCEPTANCE_MODE=true`，真实 API 失败不得回退 mock。

## 8. T13 验收风险记录

- T13 复测时间：2026-05-17 20:20。
- 工程验证：后端 `npm run lint`、`npm run typecheck`、`npm test` 通过；前端 `npm run lint`、`npm run build` 通过。
- `withFallback` 对门户、个人中心、后台列表等读接口可避免白屏，但也会掩盖关键验收失败：后端未启动、接口 404/500、开发请求头不匹配或响应结构不兼容时，页面仍可能展示 mock 数据。
- T14 做发布收口前，不能仅凭页面可见内容判定真实 API 通过；需增加验收模式、网络失败显性提示、或用 HTTP/E2E 脚本直接断言真实响应。
- 当前主流程前端阻塞项：后台新建/编辑拍品未接真实写接口，企业入驻提交未接真实写接口，意向金上传未接真实写接口，竞价详情确认出价未接真实写接口。
- 当前联调口径阻塞项：后端报价要求拍品状态为 `BIDDING`，但本轮未发现 `ANNOUNCING` 自动或手动推进到 `BIDDING` 的明确接口/任务；T14 需要先确认是通过数据准备、定时任务还是新增接口处理。

## 4. 前端状态枚举

- 拍品状态：草稿、待发布复核、发布驳回、公示中、竞拍中、已结束、成交公示中、待签约、已签约、已完成、违约、已取消
- 企业认证状态：未提交、待审核、审核通过、审核驳回
- 意向金状态：未提交、待审核、审核通过、审核驳回
- 合同状态：待签约、已签约、已完成、违约
- 退款状态：未退款、审核中、已退款
- 通知类型：成交通知、失败通知
- 通知渠道：站内消息、短信

## 5. 接口返回建议

列表接口建议统一返回：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

操作接口建议统一返回：

```json
{
  "success": true,
  "message": "操作成功"
}
```

错误提示需要覆盖：

- 未登录
- 企业未认证
- 企业认证审核中
- 意向金未审核通过
- 被拉黑
- 竞拍已结束
- 报价不符合加价规则
- 附件无查看权限
