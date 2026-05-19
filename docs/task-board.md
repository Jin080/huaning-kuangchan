# Task Board

状态只使用：TODO、IN_PROGRESS、BLOCKED、DONE、NEEDS_REVIEW。

## 总表

| ID | 状态 | 模块 | 任务 | 依赖 | 负责人/会话 | 备注 |
|---|---|---|---|---|---|---|
| T00 | DONE | 总控 | 建立总控协作文档 | 无 | 总控会话 | 已建立 5 个固定协作文档 |
| T01 | DONE | 环境 | 连接本地目录与远程 Git 仓库 | 人工确认 | 总控会话 | `git status --short` 可用；origin 指向 `https://github.com/Jin080/huaning-kuangchan.git` |
| T02 | DONE | 前端基础 | 修复 App.tsx Fast Refresh lint 问题 | 总控授权 | 总控会话 | `frontend npm run lint` 与 `npm run build` 已通过 |
| T03 | DONE | 后端基础 | 初始化后端工程、统一响应、认证、文件上传、日志 | 无 | 后端基础架构会话 | lint/typecheck/test/health 已通过 |
| T04 | DONE | 数据模型 | Prisma schema 与状态枚举 | T03 | 数据模型与 Prisma 会话 | PostgreSQL `127.0.0.1:55432` 上 `prisma migrate dev --name init` 已通过 |
| T05 | DONE | 拍品后台 | 拍品创建/复核/公示 API 与页面接入 | T03,T04 | 拍品发布与审核后台会话 | lint/typecheck/test 全量通过 |
| T06 | DONE | 企业认证 | 企业入驻、认证审核、驳回重提 | T03,T04 | 企业认证与意向金会话 | lint/typecheck/test 全量通过；竞价后续接入资格服务 |
| T07 | DONE | 意向金资格 | 凭证上传、审核、资格 | T05,T06 | 企业认证与意向金会话 | 已提供 `DepositsService.hasBiddingQualification`，竞价模块需复用 |
| T08 | DONE | 竞价核心 | 报价校验、最高价、结束中标 | T04,T05,T06,T07 | 竞价核心会话 | lint/typecheck/test 全量通过；延时竞价结构化规则待后续确认 |
| T09 | DONE | 成交合同退款黑名单 | 成交公示、合同、退款、黑名单 | T08 | 成交合同退款黑名单会话 | 含退款自动生成补充；lint/typecheck/test 全量通过 |
| T10 | DONE | 个人中心消息 | 我的认证/意向金/出价/通知 | T06,T07,T08,T09 | 个人中心消息会话 | lint/typecheck/test 全量通过；企业端数据隔离已覆盖 |
| T11 | DONE | 内容管理 | 资讯与公开说明 | T03,T04 | 内容管理与公开说明会话 | lint/typecheck/test 全量通过 |
| T12 | DONE | 前台门户接入 | 首页、公告、竞价、成交、资讯真实 API | T03,T04,T05,T07,T08,T09,T10,T11,T15 | 前台门户接入会话 | 门户与个人中心真实 API 第一阶段完成，lint/build 通过 |
| T13 | DONE | 测试验收 | 主流程 E2E 用例与权限用例 | T03-T17 | 测试验收与联调会话 | 工程验证通过；完整前后端联调未通过，已输出阻塞缺陷清单 |
| T14 | DONE | 集成发布 | `api.ts` 真实 API 适配与联调 | T03-T17,T13 | T14 集成发布收口会话 | 主流程 HTTP/DB E2E 通过；可判定主流程收口门槛通过，剩余非阻塞事项转后续 |
| T15 | DONE | 门户数据看板 | 首页数据看板统计接口 | T09 | 门户数据看板会话 | `GET /api/portal/dashboard` 已完成，后端全量测试通过 |
| T16 | DONE | 后台管理接入 | 后台审核、交易、内容管理真实 API | T05,T06,T07,T08,T09,T11,T12 | 后台管理接入会话 | 后台列表和低风险状态流转第一阶段完成，lint/build 通过 |
| T17 | DONE | 意向金审核展示字段小修 | 后台意向金审核列表展示企业名和拍品名 | T07,T16 | 意向金审核展示字段小修会话 | 后端已补充企业/拍品名称字段，前端名称优先、ID 兜底；lint/typecheck/build 通过 |
| T18 | DONE | 发布前补强 | 附件权限 HTTP/E2E、竞拍结束调度入口、发布说明 | T14 | T18 发布前补强会话 | 敏感附件权限与竞拍结束 HTTP 入口已补，发布清单已新增 |
| T19 | DONE | 发布归档 | 发布前人工复核、提交清单、剩余事项归档 | T18 | T19 发布前人工复核与提交归档会话 | 已完成发布前人工复核、提交清单和剩余事项归档；总控已同步状态 |
| T20 | DONE | 提交范围确认 | 提交范围确认与基线归档 | T19 | T20 提交范围确认与基线归档会话 | 已盘点本阶段建议提交范围；保留 `renzheng/*.png` 删除状态为总控待确认；未执行提交 |
| T21A | DONE | 后台内容接入 | 后台内容新建/编辑真实接入 | T11,T16,T20 | T21A 后台内容新建/编辑真实接入会话 | 已接入 `POST /api/admin/contents` 与 `PUT /api/admin/contents/{id}`；前端 lint/build 通过 |
| T21B | DONE | 后台黑名单接入 | 后台黑名单手动拉黑/解除拉黑真实接入 | T09,T16,T20 | T21B 后台黑名单手动拉黑/解除拉黑真实接入会话 | 已接入 `POST /api/admin/blacklist` 与 `POST /api/admin/blacklist/{id}/release`；前端 lint/build 通过 |
| T21C | DONE | 文件日志盘点 | 文件管理与操作日志缺口盘点 | T16,T20 | T21C 文件管理与操作日志缺口盘点会话 | 已确认 `GET /api/admin/files`、`GET /api/admin/logs` 后端未实现，前端仍使用 mock |
| T22 | DONE | 联合验收 | T21 联合验收与任务板同步 | T20,T21A,T21B,T21C | T22 联合验收与任务板同步会话 | 已核对 T20/T21A/T21B/T21C 交接并补记任务板；前端 lint/build 通过 |
| T23 | DONE | 后端文件日志 | 后端 admin files/logs 只读接口 | T21C,T22 | T23A/T23B 后端文件日志只读接口会话 | 已补 `GET /api/admin/files` 与 `GET /api/admin/logs` 管理员只读列表；不引入上传、删除等写能力 |
| T24 | DONE | 前端文件日志 | 文件管理与操作日志前端真实接入 | T23 | T24 文件管理与操作日志前端真实接入会话 | 文件管理页、操作日志页已优先请求真实 API；开发失败沿用 fallback/notice，验收模式失败不回退 mock |
| T25 | DONE | 操作日志 | 日志写入持久化最小改造 | T23,T24 | T25 日志写入持久化最小改造会话 | `OperationLogService.record()` 已写入 `operation_logs`；logging 测试覆盖写库、list 查询和黑名单业务路径 |
| T26 | DONE | 提交前收口 | 全量收口复核与提交前检查 | T20-T25 | T26 全量收口复核与提交前检查会话 | 已复核 T20-T25 状态；后端 lint/typecheck/test、三条关键 E2E、前端 lint/build、`git diff --check` 均通过；可进入提交准备但需总控确认提交范围与 `renzheng/*.png` 删除状态 |
| T27 | DONE | 提交准备 | 提交范围最终确认与提交准备 | T26 | T27 提交范围最终确认与提交准备会话 | 已确认 `frontend/src/index.css` 属于本阶段前端接入/页面布局收尾范围；建议保留并提交 5 个 `renzheng/*.png` 删除项 |
| T28 | DONE | 提交归档 | 提交完成归档与推送前确认 | T27 | T28 提交完成归档与推送前确认会话 | 本地发布与总控归档记录已恢复推送成功；`origin/main` 已到 `85d2260` |
| T29 | DONE | 前端导航 | 前端页面导航联通与按钮跳转收口 | T28 | T29 前端页面导航联通与按钮跳转收口会话 | 已补轻量导航工具并接通门户顶栏、后台侧栏、企业中心菜单和关键按钮；lint/build/Playwright 点击验收通过 |
| T30 | DONE | 联调验收 | 前后端真实运行点击联调 | T29 | T30 联调验收会话 / 总控复核 | T30A/T30B/T30C/T30D 后全链路复验通过；门户、后台、企业中心点击跳转与真实 API 加载同时成立 |
| T30A | DONE | 联调修复 | CORS/OPTIONS 最小修复 | T30 | T30A 执行会话 | 已启用开发 CORS/OPTIONS；总控复跑 `main-cors`、lint、typecheck 通过 |
| T30B | DONE | 联调数据 | Seed 配置与开发数据修复 | T30 | T30B 执行会话 | 已修复 seed 配置并产出 ADMIN/ENTERPRISE 用户 UUID；总控复跑 seed 与只读计数通过 |
| T30C | DONE | 联调修复 | Lots 查询参数数字转换修复 | T30 | T30C 执行会话 | 已修复 `/api/lots?pageSize=100` 与 `/api/admin/lots?pageSize=100` 查询参数 400；总控复跑 lots 测试通过 |
| T30D | DONE | 联调认证 | 开发认证用户 UUID 口径同步 | T30B | T30D 执行会话 / 总控复核 | 已同步前端开发请求头 UUID 口径；总控复跑前端 lint/build 与企业中心 profile HTTP 验证通过 |
| T31 | DONE | 数据增强 | 后台/企业端列表补原始 lotId | T30D | T31 执行会话 / 总控复核 | 已补前端类型、真实 API mapper 与 mock fallback 的原始 lotId 保留；后端现有响应已带 lotId，未改后端服务 |
| T32 | DONE | 文件上传 | 后台拍品录入本地图片/附件上传体验 | T30,T31 | T32A/T32B 执行会话 / 总控复核 | 已补真实 `POST /api/files/upload` 与 `/admin/lots/edit` 三处上传接入，图一/图二/检测报告上传成功后回填真实文件 URL |
| T32A | DONE | 文件上传 | 后端真实文件上传接口 | T30,T31 | T32A 执行会话 / 总控复核 | 新增 `POST /api/files/upload` 与 `GET /api/files/content/{id}`，复用 Attachment 模型，不改 Prisma schema |
| T32B | DONE | 文件上传 | 前端拍品表单真实上传接入 | T32A,T38A | T32B 执行会话 / 总控复核 | `/admin/lots/edit` 图一、图二、检测报告均接真实 file input 与 multipart 上传，保存草稿/提交复核链路复核通过 |
| T33 | TODO | 生产认证 | 登录/JWT 与角色权限生产化 | T30 | 待排期 | 上线必做：替换开发期 `x-user-id`/`x-user-role` 直传模式，完成登录、JWT、会话持久化和 ADMIN/ENTERPRISE 权限保护 |
| T34 | DONE | 竞价修复 | 出价按加价次数计算 | T30,T31 | T34 执行会话 / 总控复核 | 竞价详情页已改为出价加价次数步进器并提交计算金额；后端测试锁定合法倍数与非法金额兜底 |
| T35 | DONE | 前端视觉 | 拍卖详情页按 Stitch 效果复刻 | T30,T31,T34 | T35 执行会话 / 总控复核 | 已基于 Stitch 竞价详情页参考源复刻拍卖详情布局，并保留 T34 次数报价交互；桌面/移动截图已留档 |
| T36 | DONE | 前端视觉 | 全站 Stitch 页面效果复刻盘点与分批计划 | T35 | T36 执行会话 / 总控复核 | 已产出 `docs/qa/stitch-full-replication-plan.md`，完成 Stitch 页面映射、差异清单、优先级和 T37/T38 分批计划 |
| T37 | DONE | 前端视觉 | 门户与详情页 Stitch 全面复刻 | T36 | T37A/T37B/T37C/T37D 执行会话 / 总控复核 | T37A 门户通用组件与首页、T37B 门户列表与普通详情、T37C 登录/企业入驻、T37D 首页最新智能交互版收口已完成；资源页本轮不新增路由，沿用拍品公告入口 |
| T37A | DONE | 前端视觉 | 门户通用组件与首页 Stitch 复刻 | T36 | T37A 执行会话 / 总控复核 | 已复刻门户头部、首页与页脚，保留真实 API 与导航行为；总控复跑前端 lint/build、Playwright 首页与竞价详情轻量复核通过 |
| T37B | DONE | 前端视觉 | 门户列表与普通详情页 Stitch 复刻 | T37A | T37B 执行会话 / 总控复核 | 已复刻公告/竞价/成交/资讯/公开说明列表与普通详情页；总控复跑前端 lint/build、diff check 与 8 条门户路径 Playwright 宽度/console 复核通过 |
| T37C | DONE | 前端视觉 | 门户登录、企业入驻、资源页决策 | T37B | T37C 执行会话 / 总控复核 | 已复刻 `/login` 与 `/enterprise/register`，保留现有导航与企业入驻真实提交；总控复跑前端 lint/build、diff check 与两页 Playwright 宽度/console 复核通过 |
| T37D | DONE | 前端视觉 | PC 首页最新 Stitch 智能交互版替换收口 | T37A,T37B,T37C | T37D 执行会话 | 已复核 Stitch MCP screen `6de9c056dd3c45c291a22c0c53293642`，首页替换为最新“智能交互门户首页”结构；保留真实 API 与导航行为，截图留档 |
| T38 | DONE | 前端视觉 | 后台与企业中心 Stitch 全面复刻 | T36 | T38A/T38B/T38C 执行会话 / 总控复核 | T38A 后台核心页面、T38B 后台交易/企业管理/内容运营/系统审计、T38C 企业中心均已完成；真实 API 与既有操作口径保持不变 |
| T38A | DONE | 前端视觉 | 后台通用组件与核心拍品/审核页面 Stitch 复刻 | T36,T37 | T38A 执行会话 / 总控复核 | 已复刻后台首页、拍品管理、新建/编辑拍品、三类审核页；保留真实 API、mock fallback、navigateTo 和既有行操作；上传卡仅视觉占位 |
| T38B | DONE | 前端视觉 | 后台交易、企业管理、内容运营、系统审计页面 Stitch 复刻 | T38A | T38B 执行会话 / 总控复核 | 已复刻 `/admin/bids`、`/admin/results`、`/admin/contracts`、`/admin/refunds`、`/admin/blacklist`、`/admin/content`、`/admin/notifications`、`/admin/files`、`/admin/logs`；截图留档 |
| T38C | DONE | 前端视觉 | 企业中心页面 Stitch 复刻 | T38A | T38C 执行会话 / 总控复核 | 已复刻 `/account`、`/account/certification`、`/account/deposits`、`/account/bids`、`/account/messages`；企业端开发请求头 UUID 口径保持不变 |
| T39 | DONE | 联调数据 | 竞价功能真实验证数据准备 | T30,T32,T38 | 总控调度 / 验证会话 | 已准备审核通过企业、竞价中拍品、已审核意向金并完成真实报价验证；后续报价需按页面当前价继续计算 |
| T40 | DONE | 竞价体验 | 门户登录状态与竞价报价体验修复 | T33 前开发态,T39 | T40 执行会话 / 总控复核 | 登录后门户头部显示企业名/认证状态/退出；mock 拍品禁止真实报价；加价次数支持手动输入；仍使用开发认证头，未实施 JWT |

## 当前可并行任务

- T33 可启动：登录/JWT 与角色权限生产化，建议拆为后端认证、前端登录态接入、权限回归验收三批。
- 提交收口可启动：当前 T37D/T38B/T38C/T40 均已完成但尚未提交，需要按批次 stage，避免混入本地 Stitch 源和未确认截图。

## 当前必须串行任务

- T33 上线必做能力仍需排期，完成后必须重跑主流程、敏感附件权限和企业数据隔离验收。
- T37D/T38B/T38C/T40 提交前需先确认提交批次；`docs/agent-handoff.md`、`docs/frontend-backend-integration-checklist.md` 当前同时包含多批追加记录，不宜用 `git add .`。
