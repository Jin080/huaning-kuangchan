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
| T30 | NEEDS_REVIEW | 联调验收 | 前后端真实运行点击联调 | T29 | T30 联调验收会话 | 真实运行点击联调未通过；点击跳转成立，但真实 API 加载被 CORS/seed/pageSize/开发用户 UUID 阻塞 |
| T30A | IN_PROGRESS | 联调修复 | CORS/OPTIONS 最小修复 | T30 | T30A 执行会话 | 修复前端 5173 调用后端 3100 时的 CORS/OPTIONS 预检阻塞 |
| T30B | IN_PROGRESS | 联调数据 | Seed 配置与开发数据修复 | T30 | T30B 执行会话 | 修复 `npx prisma db seed` 无数据问题，并产出 ADMIN/ENTERPRISE 用户 UUID |
| T30C | IN_PROGRESS | 联调修复 | Lots 查询参数数字转换修复 | T30 | T30C 执行会话 | 修复 `/api/lots?pageSize=100` 与 `/api/admin/lots?pageSize=100` 查询参数 400 |
| T30D | BLOCKED | 联调认证 | 开发认证用户 UUID 口径同步 | T30B | T30D 待命 | 等 T30B 给出真实 UUID 后再调整前端开发请求头口径与文档 |
| T31 | TODO | 数据增强 | 后台/企业端列表补原始 lotId | T30D | 待排期 | 后续增强：补齐后台/企业端列表行可用的原始拍品 ID，减少前端按标题兜底匹配 |
| T32 | TODO | 文件上传 | 后台拍品录入本地图片/附件上传体验 | T30,T31 | 待排期 | 上线必做：后台新建/编辑拍品支持点击上传并弹窗选择本地图片/检测报告，上传成功后回填拍品表单 |
| T33 | TODO | 生产认证 | 登录/JWT 与角色权限生产化 | T30 | 待排期 | 上线必做：替换开发期 `x-user-id`/`x-user-role` 直传模式，完成登录、JWT、会话持久化和 ADMIN/ENTERPRISE 权限保护 |

## 当前可并行任务

- T30A/T30B/T30C 已并行执行；写入范围分别为后端启动/CORS、seed 数据、lots 查询 DTO，需总控后续逐项验收。
- 可并行只读盘点：如需扩大范围，可另起只读会话盘点后台首页最近操作日志真实 API 接入、登录/JWT、结构化延时竞价、内置定时框架的后续排期。
- 发布后待确认：确认结构化延时竞价、后台非主链路真实接入、内置定时框架的后续阶段排期。

## 当前必须串行任务

- T30D 开发认证用户 UUID 口径同步：必须等待 T30B 产出并经总控确认真实 ADMIN/ENTERPRISE 用户 UUID 后再启动。
- T30 复验：必须等待 T30A/T30B/T30C/T30D 全部完成并验收后，再重跑真实运行点击联调。
- T32/T33 属于上线必做能力，建议在 T30 联调问题闭合后排入最近一批，不建议与 T30 混做。
