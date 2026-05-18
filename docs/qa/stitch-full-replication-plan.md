# T36 Stitch 全站页面效果复刻盘点与分批计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 `stitch_document_to_webpage_generator/` 为本地 Stitch 源，盘点所有页面/屏幕/组件，对照当前 React 路由拆分 T37/T38 后续复刻任务。

**Architecture:** 本轮只做文档盘点，不修改业务代码。后续复刻应优先把公共布局、表格、筛选、状态标签、详情抽屉、操作卡等收敛到现有 React 组件和 `frontend/src/index.css`，再分批替换页面结构；每批必须保留真实 API 接入和 T34 出价口径。

**Tech Stack:** React + TypeScript + Vite；当前无路由框架，使用 `frontend/src/App.tsx` 路由表与 `navigateTo`；样式集中在 `frontend/src/index.css`。

---

## 1. 读取来源与结论

- Stitch 本地源码目录：`E:/kuangchan/stitch_document_to_webpage_generator/`。
- 关键源文件：
  - `stitch_frontend_page_prompts.md`：页面生成提示词，覆盖 PC 门户、PC 管理后台、企业用户中心，并预留小程序规划。
  - `institutional_integrity/DESIGN.md`：Stitch 设计系统，定义政务蓝、深灰、白色、浅灰、8px 卡片半径、高密度表格、右侧详情抽屉、骨架屏等规则。
  - `_1` 至 `_36`：36 个编号 HTML 屏幕，每个目录含 `code.html`；多数含 `screen.png`。
  - `pc/` 与 `huaning_mineral_auction_platform_1` 至 `_4`：与 `_22/_23` 相同 hash 的门户首页重复版本。
- 截图可用性：多数 `screen.png` 为 28 bytes，不能作为有效截图验收依据；`_6/screen.png` 与 `_35/screen.png` 体积正常。后续复刻截图应以运行中的 React 页面重新生成。
- 纳入仓库建议：不要整体提交 `stitch_document_to_webpage_generator/`。建议只提交必要的计划文档与必要参考 HTML/截图；如需长期留存 Stitch 源，先由总控确认后挑选去重后的 `code.html` 与设计规范，不提交重复目录。

## 2. 当前 React 路由范围

当前 `frontend/src/App.tsx` 已有 32 个路由：

- 门户：`/`、`/announcements/upcoming`、`/announcements/upcoming/detail`、`/auctions/live`、`/auctions/live/detail`、`/results`、`/results/detail`、`/news`、`/news/detail`、`/disclosures`、`/login`、`/enterprise/register`。
- 后台：`/admin/dashboard`、`/admin/lots`、`/admin/lots/edit`、`/admin/reviews/lots`、`/admin/reviews/enterprises`、`/admin/reviews/deposits`、`/admin/bids`、`/admin/results`、`/admin/contracts`、`/admin/refunds`、`/admin/blacklist`、`/admin/content`、`/admin/notifications`、`/admin/files`、`/admin/logs`。
- 企业中心：`/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages`。

当前 React 缺口：

- 无 `/resources` 矿产资源列表页。
- 无 `/resources/detail` 矿产资源详情页。
- 无 `/admin/login` 后台登录页。
- `/admin/bids` 有 React 页面，但本地 Stitch 目录未发现对应已生成 HTML，仅在提示词中存在。

## 3. T35 覆盖情况

- 已覆盖：`/auctions/live/detail` 竞价详情页，来源为 `_30/code.html` 的竞价详情布局思想，并保留 T34 “出价加价次数”口径。
- 仍需复刻：除竞价详情页外的门户列表/详情、首页、登录、企业入驻、后台各页、企业中心各页、通用组件与全局样式。
- 注意：T35 已覆盖的竞价详情页后续只允许做微调或与门户公共样式一致性修正，不应重写 T34 出价交互、不改后端、不改 Prisma schema。

## 4. Stitch 页面映射表

| Stitch 源 | Stitch 页面/屏幕 | 当前路由/文件 | 当前状态与差异 | 优先级 | T35 覆盖 |
|---|---|---|---|---|---|
| `_22/code.html`、`_23/code.html`、`pc/code.html`、`huaning_mineral_auction_platform_1-4/code.html` | PC 门户首页 | `/`；`frontend/src/pages/PortalPages.tsx` `PortalHome` | React 已有首页，但 Stitch 首页包含更完整的政务门户头部、数据看板、正在竞价卡片、矿产资源、公告与成交分区；重复目录 hash 相同，选一个来源即可。 | P0 | 否 |
| `_3/code.html`、`_14/code.html`、`_13/code.html` | 门户首页视觉变体 | `/`；`PortalHome` | 这三份是首页不同视觉探索，标题与首屏风格差异较大；建议只作为视觉参考，不作为主映射来源，避免首页需求漂移。 | P2 | 否 |
| 提示词 3.2 | 矿产资源列表页 | 无当前路由；可新增 `/resources` | 当前 App 无路由；门户顶部“矿产资源”在 T29 暂映射到即将拍卖列表。需要总控确认是否新增路由。 | P1 | 否 |
| 提示词 3.3 | 矿产资源详情页 | 无当前路由；可新增 `/resources/detail` | 当前无独立资源详情；拍品公告详情和竞价详情承担部分展示能力。需要总控确认是否新增路由。 | P1 | 否 |
| `_18/code.html` | 即将拍卖公告列表页 | `/announcements/upcoming`；`UpcomingList` | React 已有表格与筛选，但 Stitch 有更政务化公告列表、搜索/重置、状态与空态视觉；需复刻列表密度与表头。 | P0 | 否 |
| `_27/code.html` | 即将拍卖公告详情页 | `/announcements/upcoming/detail`；`UpcomingDetail` | React 仍是 `DetailHero` + `InfoTabs` 基础结构；Stitch 包含面包屑、公告标题、资格办理卡、异常提示、附件/规则分区；待复刻。 | P0 | 否 |
| `_34/code.html` | 正在竞价标的列表页 | `/auctions/live`；`LiveAuctionList` | React 使用简单卡片网格；Stitch 有筛选区、竞价卡片/表格混合、当前价与倒计时强化；待复刻。 | P0 | 否 |
| `_30/code.html` | 竞价详情页 | `/auctions/live/detail`；`AuctionDetail`、`AuctionDetailView` | T35 已复刻核心结构：流程条、图文详情、右侧 sticky 出价卡、实时动态、出价记录；后续只做一致性微调。 | P0 | 是 |
| `_26/code.html` | 成交公示列表页 | `/results`；`ResultList` | React 已有表格；Stitch 有更完整公示表格、筛选与状态空态；待复刻。 | P1 | 否 |
| `_31/code.html` | 成交公示详情页 | `/results/detail`；`ResultDetail` | React 仅成交卡和按钮；Stitch 有面包屑、成交状态角标、拍品摘要信息；待复刻。 | P1 | 否 |
| `_21/code.html` | 信息资讯列表页 | `/news`；`NewsList` | React 已有分类栏和表格；Stitch 有更清晰分类导航、新闻列表卡片、搜索和分页；待复刻。 | P2 | 否 |
| `_20/code.html` | 信息资讯详情页 | `/news/detail`；`NewsDetail` | React 正文较短且通用；Stitch 有公告详情阅读版式、章节标题、元信息；待复刻。 | P2 | 否 |
| `_7/code.html` | 公开说明页 | `/disclosures`；`DisclosurePage` | React 仅目录+文章卡；Stitch 有说明目录、章节正文、规则结构；待复刻。 | P2 | 否 |
| `_35/code.html` | 企业登录页 | `/login`；`LoginPage` | React 已有登录卡；Stitch 登录页截图可用，整体更接近政务登录；待复刻但仍不实现 T33 登录/JWT。 | P1 | 否 |
| `_29/code.html` | 企业入驻页 | `/enterprise/register`；`EnterpriseRegisterPage` | React 表单分组字段较全；Stitch 有流程提示、附件上传卡、固定操作栏；需与 T32 文件上传计划协调。 | P1 | 否 |
| 提示词 4.1 | 后台登录页 | 无当前路由；可新增 `/admin/login` | Stitch 仅有提示词，未发现已生成 HTML。是否新增后台登录页应等待 T33 生产认证确认。 | P2 | 否 |
| `_17/code.html` | 后台首页/数据看板 | `/admin/dashboard`；`AdminDashboard` | React 有数据卡、待办、最近日志；Stitch 有更完整后台框架、业务总览、待办与统计版式；待复刻。 | P0 | 否 |
| `_9/code.html` | 拍品管理列表页 | `/admin/lots`；`LotManagementPage` | React 已有真实 API 列表与操作；Stitch 表格、筛选、详情抽屉、状态流转更完整；待复刻，保留现有 API 行操作。 | P0 | 否 |
| `_4/code.html` | 新建/编辑拍品页 | `/admin/lots/edit`；`LotEditPage` | React 表单字段齐全但视觉基础；Stitch 有上传控件、业务配置分区、提交确认提示；待复刻，需与 T32 上传体验协调。 | P0 | 否 |
| `_16/code.html` | 标的发布复核页 | `/admin/reviews/lots`；`LotReviewPage` | React 使用通用列表和 drawer preview；Stitch 包含更明确待审表格、右侧详情抽屉、审核确认文案；待复刻。 | P0 | 否 |
| `_6/code.html` | 企业认证审核页 | `/admin/reviews/enterprises`；`EnterpriseReviewPage` | React 已有列表；Stitch 截图可用，详情抽屉和企业资料分组更完整；待复刻。 | P0 | 否 |
| `_5/code.html` | 意向金凭证审核页 | `/admin/reviews/deposits`；`DepositReviewPage` | React 已有真实 API 列表；Stitch 有凭证预览、审核抽屉、审核通过/驳回确认；待复刻。 | P0 | 否 |
| 提示词 4.8 | 竞价记录管理页 | `/admin/bids`；`BidManagementPage` | React 已有出价记录管理页；本地 Stitch 未发现生成 HTML，只能按提示词复刻通用后台表格和抽屉。 | P1 | 否 |
| `_25/code.html` | 成交结果管理页 | `/admin/results`；`ResultManagementPage` | React 已有列表与发布公示操作；Stitch 有详情抽屉和发布确认弹窗；待复刻。 | P1 | 否 |
| `_28/code.html` | 合同状态管理页 | `/admin/contracts`；`ContractManagementPage` | React 已有列表和状态操作；Stitch 有状态变更弹窗、备注/违约原因表达；待复刻。 | P1 | 否 |
| `_33/code.html` | 退款状态管理页 | `/admin/refunds`；`RefundManagementPage` | React 已有列表；Stitch 有退款状态弹窗和线下退款提示；待复刻。 | P1 | 否 |
| `_15/code.html` | 黑名单管理页 | `/admin/blacklist`；`BlacklistManagementPage` | React 已有手动拉黑表单和列表；Stitch 有顶部按钮、拉黑/解除弹窗、详情抽屉；待复刻。 | P1 | 否 |
| `_11/code.html` | 内容管理页 | `/admin/content`；`ContentManagementPage` | React 已有内容表单和列表；Stitch 有分类树、内容列表、编辑区域；待复刻。 | P2 | 否 |
| `_10/code.html` | 通知管理页 | `/admin/notifications`；`NotificationManagementPage` | React 已有列表；Stitch 有通知内容抽屉、渠道/类型筛选；待复刻。 | P2 | 否 |
| `_36/code.html` | 文件管理页 | `/admin/files`；`FileManagementPage` | React 已有真实 API 文件列表；Stitch 有文件预览抽屉、权限控制状态；待复刻。 | P2 | 否 |
| `_1/code.html` | 操作日志页 | `/admin/logs`；`OperationLogPage` | React 已有真实 API 日志列表；Stitch 有高密度日志表格和详情抽屉；待复刻。 | P2 | 否 |
| `_8/code.html` | 企业用户中心首页 | `/account`；`AccountHome` | React 有状态卡和摘要表格；Stitch 有企业中心菜单、企业状态、待办摘要；待复刻。 | P1 | 否 |
| `_32/code.html` | 我的企业认证页 | `/account/certification`；`MyCertificationPage` | React 当前只展示 profile 状态和只读示例字段；Stitch 有完整资料分组、状态/驳回原因；待复刻。 | P1 | 否 |
| `_2/code.html` | 我的意向金页 | `/account/deposits`；`MyDepositsPage` | React 已有列表；Stitch 有企业中心布局、筛选、凭证状态和操作；待复刻。 | P1 | 否 |
| `_19/code.html` | 我的出价记录页 | `/account/bids`；`MyBidsPage` | React 已有列表；Stitch 有筛选、当前最高价状态、进入详情按钮；待复刻。 | P1 | 否 |
| `_12/code.html`、`_24/code.html` | 我的通知页 | `/account/messages`；`MyMessagesPage` | 两个 Stitch 版本均为消息通知；React 已有表格和标记已读。建议择优合并消息列表+详情区域，不重复实现。 | P1 | 否 |

## 5. Stitch 通用组件与样式盘点

后续复刻应优先抽取或统一这些通用效果：

- 门户头部与页脚：政务蓝品牌、顶部导航、登录/企业入驻按钮、搜索入口。
- 后台/企业中心侧栏：240px 固定侧栏、分组导航、顶部栏、用户区。
- 页面头与面包屑：标题、说明、当前位置。
- 筛选表单：关键词、状态、时间区间、搜索/重置按钮。
- 高密度表格：浅灰表头、斑马纹、分页、行内操作。
- 状态标签：公示中、竞拍中、审核通过、审核驳回、未退款、已退款、已读/未读等。
- 详情抽屉：右侧 40%-60% 宽度，头部、内容分组、底部操作。
- 确认弹窗：发布、驳回、关闭、违约、退款、拉黑、解除等高风险操作。
- 操作卡：公告详情意向金资格卡、竞价详情出价卡。
- 附件/上传卡：拍品图片、检测报告、营业执照、企业资质、付款凭证；T32 会涉及真实上传体验。
- 骨架/空态：Stitch 提示词要求数据列表加载和无数据状态，但当前 React 多数页面未显式实现。

## 6. 推荐任务拆分

### T37A：门户通用组件与首页

**目标：** 复刻门户公共头部、页脚、首页。
**允许修改文件：**

- `frontend/src/components/Layouts.tsx`
- `frontend/src/components/Cards.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/pages/PortalPages.tsx`
- `frontend/src/index.css`
- `docs/frontend-backend-integration-checklist.md`
- `docs/qa/t37-artifacts/**`
- `docs/agent-handoff.md` 仅追加

**验证：**

- `Set-Location E:/kuangchan/frontend; npm run lint`
- `Set-Location E:/kuangchan/frontend; npm run build`
- Playwright 打开 `/`，截图 `docs/qa/t37-artifacts/t37a-portal-home-desktop.png` 与 `t37a-portal-home-mobile.png`。
- Playwright 检查 `console error = 0`，移动端 `documentElement.scrollWidth <= innerWidth`。

### T37B：门户列表与普通详情

**目标：** 复刻即将拍卖列表/详情、正在竞价列表、成交公示列表/详情、信息资讯列表/详情、公开说明。
**允许修改文件：**

- `frontend/src/pages/PortalPages.tsx`
- `frontend/src/components/DataTable.tsx`
- `frontend/src/components/FilterBar.tsx`
- `frontend/src/components/StatusTag.tsx`
- `frontend/src/index.css`
- `docs/frontend-backend-integration-checklist.md`
- `docs/qa/t37-artifacts/**`
- `docs/agent-handoff.md` 仅追加

**验证：**

- `Set-Location E:/kuangchan/frontend; npm run lint`
- `Set-Location E:/kuangchan/frontend; npm run build`
- Playwright 逐页打开 `/announcements/upcoming`、`/announcements/upcoming/detail`、`/auctions/live`、`/results`、`/results/detail`、`/news`、`/news/detail`、`/disclosures`。
- 截图至少包括桌面：`t37b-upcoming-list-desktop.png`、`t37b-upcoming-detail-desktop.png`、`t37b-live-list-desktop.png`、`t37b-results-list-desktop.png`、`t37b-news-list-desktop.png`、`t37b-disclosures-desktop.png`；移动端抽检 `t37b-upcoming-detail-mobile.png` 与 `t37b-news-list-mobile.png`。
- 验收模式运行时，关键真实 API 请求不得被 mock/fallback 判定为通过。

### T37C：门户登录、企业入驻、资源页决策

**目标：** 复刻企业登录与企业入驻页面；是否新增矿产资源列表/详情路由由总控确认。
**允许修改文件：**

- `frontend/src/App.tsx`（仅当总控确认新增 `/resources`、`/resources/detail`、`/admin/login` 时）
- `frontend/src/pages/PortalPages.tsx`
- `frontend/src/components/Layouts.tsx`
- `frontend/src/index.css`
- `docs/frontend-backend-integration-checklist.md`
- `docs/qa/t37-artifacts/**`
- `docs/agent-handoff.md` 仅追加

**验证：**

- `Set-Location E:/kuangchan/frontend; npm run lint`
- `Set-Location E:/kuangchan/frontend; npm run build`
- Playwright 打开 `/login`、`/enterprise/register`，如新增资源页则打开 `/resources`、`/resources/detail`。
- 截图：`t37c-login-desktop.png`、`t37c-enterprise-register-desktop.png`、`t37c-enterprise-register-mobile.png`；如新增资源页则补 `t37c-resources-list-desktop.png`、`t37c-resources-detail-desktop.png`。
- 注意：本批不实施 T33 登录/JWT；登录按钮仍按当前导航或后续 T33 决策处理。

### T38A：后台通用组件与核心拍品/审核页面

**目标：** 复刻后台框架、看板、拍品管理、新建/编辑、三类审核页面。
**允许修改文件：**

- `frontend/src/components/Layouts.tsx`
- `frontend/src/components/DataTable.tsx`
- `frontend/src/components/FilterBar.tsx`
- `frontend/src/components/StatusTag.tsx`
- `frontend/src/pages/AdminPages.tsx`
- `frontend/src/index.css`
- `docs/frontend-backend-integration-checklist.md`
- `docs/qa/t38-artifacts/**`
- `docs/agent-handoff.md` 仅追加

**验证：**

- `Set-Location E:/kuangchan/frontend; npm run lint`
- `Set-Location E:/kuangchan/frontend; npm run build`
- Playwright 打开 `/admin/dashboard`、`/admin/lots`、`/admin/lots/edit`、`/admin/reviews/lots`、`/admin/reviews/enterprises`、`/admin/reviews/deposits`。
- 截图：`t38a-admin-dashboard-desktop.png`、`t38a-admin-lots-desktop.png`、`t38a-admin-lot-edit-desktop.png`、`t38a-admin-lot-review-desktop.png`、`t38a-admin-enterprise-review-desktop.png`、`t38a-admin-deposit-review-desktop.png`。
- 操作验证：列表加载真实 API；高风险按钮失败时保留当前页面状态并提示；不改后端。

### T38B：后台交易、企业管理、内容运营、系统审计页面

**目标：** 复刻后台出价记录、成交结果、合同、退款、黑名单、内容、通知、文件、操作日志。
**允许修改文件：**

- `frontend/src/pages/AdminPages.tsx`
- `frontend/src/components/DataTable.tsx`
- `frontend/src/components/FilterBar.tsx`
- `frontend/src/components/StatusTag.tsx`
- `frontend/src/index.css`
- `docs/frontend-backend-integration-checklist.md`
- `docs/qa/t38-artifacts/**`
- `docs/agent-handoff.md` 仅追加

**验证：**

- `Set-Location E:/kuangchan/frontend; npm run lint`
- `Set-Location E:/kuangchan/frontend; npm run build`
- Playwright 打开 `/admin/bids`、`/admin/results`、`/admin/contracts`、`/admin/refunds`、`/admin/blacklist`、`/admin/content`、`/admin/notifications`、`/admin/files`、`/admin/logs`。
- 截图：至少每个模块一张桌面截图；文件名以 `t38b-admin-*.png` 命名。
- 若复刻确认弹窗/抽屉，需截图 `t38b-admin-blacklist-modal-desktop.png` 或等价高风险操作弹窗。

### T38C：企业中心页面

**目标：** 复刻企业中心首页、我的企业认证、我的意向金、我的出价记录、我的通知。
**允许修改文件：**

- `frontend/src/components/Layouts.tsx`
- `frontend/src/components/DataTable.tsx`
- `frontend/src/pages/AccountPages.tsx`
- `frontend/src/index.css`
- `docs/frontend-backend-integration-checklist.md`
- `docs/qa/t38-artifacts/**`
- `docs/agent-handoff.md` 仅追加

**验证：**

- `Set-Location E:/kuangchan/frontend; npm run lint`
- `Set-Location E:/kuangchan/frontend; npm run build`
- Playwright 打开 `/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages`。
- 截图：`t38c-account-home-desktop.png`、`t38c-account-certification-desktop.png`、`t38c-account-deposits-desktop.png`、`t38c-account-bids-desktop.png`、`t38c-account-messages-desktop.png`，移动端抽检 `t38c-account-home-mobile.png`。
- 真实 API 验证：`/api/account/profile`、`/api/account/deposit-vouchers`、`/api/account/bids`、`/api/account/messages` 在验收模式下返回 200。

## 7. 执行顺序建议

1. 先做 T37A/T37B：门户公共样式和主要公开路径最容易被用户感知，且能复用到登录、入驻、资源页。
2. 再做 T38A：后台公共框架、拍品和审核页面是后台最高频路径。
3. 再做 T38B/T38C：交易后链路、内容/审计、企业中心可复用 T38A 的表格、抽屉和状态标签。
4. T37C 中的新增资源页、后台登录页应等待总控确认，避免和 T33 登录/JWT、T32 上传能力产生范围冲突。

## 8. 全局验证门槛

每批复刻完成前必须满足：

- 不改后端、不改 Prisma schema，除非总控重新授权。
- 保留现有真实 API 接入；验收模式不得把 mock/fallback 展示当作真实 API 成功。
- `Set-Location E:/kuangchan/frontend; npm run lint` 通过。
- `Set-Location E:/kuangchan/frontend; npm run build` 通过。
- Playwright 桌面截图和指定移动截图存在，且无明显横向溢出、遮挡、按钮文字溢出。
- `npx --yes --package @playwright/cli playwright-cli -s=<session> console error` 返回 0 个错误。
- `git diff --check` 通过。

## 9. 需要总控确认

- 是否新增并复刻 `/resources`、`/resources/detail`。
- 是否新增 `/admin/login`，或等待 T33 生产认证统一处理。
- 是否允许后续把去重后的 Stitch 源 HTML 或设计规范纳入仓库；当前建议不整体提交 `stitch_document_to_webpage_generator/`。
- T37/T38 是否按上面的子批次拆开执行，避免一次性改动过大。
