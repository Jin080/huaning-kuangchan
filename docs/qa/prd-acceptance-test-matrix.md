# PRD Acceptance Test Matrix

本矩阵用于把 `docs/huaning-mineral-auction-pc-prd.md` 的验收点追溯到测试用例、角色、接口契约和当前执行状态。状态含义：

- `PASS`：已通过自动或手工验证。
- `FAIL`：已执行但结果不符合预期。
- `BLOCKED`：依赖模块、接口、数据模型或环境尚未就绪，暂不可完整执行。
- `NOT_RUN`：具备执行条件但本轮未执行。

## Role Coverage

| Case ID | PRD Reference | Role | Scenario | Expected Result | Verification Type | Current Status | Notes |
|---|---|---|---|---|---|---|---|
| ROLE-001 | 2.1, 9 | 公众访客 | 查看首页、公告、竞价列表、成交公示、资讯、公开说明 | 可查看公开信息，不可报名、上传凭证、报价 | Manual + E2E | BLOCKED | 前端为 mock 页面，真实 API 未接入 |
| ROLE-002 | 2.1, 10 | 公众访客 | 未登录点击报名或报价 | 引导登录或返回 `UNAUTHORIZED` | API + E2E | BLOCKED | 认证与后端业务接口未实现 |
| ROLE-003 | 2.2, 3.2, 9 | 企业用户 | 提交企业认证并查看本企业认证状态 | 状态进入 `待审核`，只能查看本企业数据 | API + E2E | BLOCKED | 企业认证 API/模型未实现 |
| ROLE-004 | 2.2, 3.3, 9 | 企业用户 | 认证通过后上传意向金凭证 | 状态进入 `待审核`，附件受权限控制 | API + E2E | BLOCKED | 文件与意向金模块未实现 |
| ROLE-005 | 2.2, 3.4 | 企业用户 | 意向金通过后参与对应拍品竞价 | 合法报价成功，当前最高价刷新 | API + E2E | BLOCKED | 竞价核心未实现 |
| ROLE-006 | 2.3, 5 | 平台管理员 | 拍品、企业、意向金、成交、合同、退款、黑名单管理 | 管理员可查看和操作全量后台数据，关键操作留痕 | API + E2E | BLOCKED | 后端基础仅有骨架，业务接口未实现 |
| ROLE-007 | 5.7, 9, 10 | 黑名单企业 | 被拉黑后登录或操作 | 账号封禁或返回 `BLACKLISTED`，提示联系平台客服 | API + E2E | BLOCKED | 黑名单模块未实现 |

## Main Flow Coverage

| Case ID | PRD Reference | Flow Step | Contract/API Reference | Expected Result | Current Status | Defect/Blocker |
|---|---|---|---|---|---|---|
| FLOW-001 | 3.1, 5.1, 6.1, 12 | 管理员创建拍品草稿 | `POST /api/admin/lots` | 必填字段完整，状态 `草稿` | BLOCKED | 后端业务接口与 Prisma schema 未实现 |
| FLOW-002 | 3.1, 5.1, 11.1 | 管理员提交发布复核 | `POST /api/admin/lots/{id}/submit-review` | 状态 `待发布复核`，操作日志记录 | BLOCKED | 拍品复核模块未实现 |
| FLOW-003 | 3.1, 5.2 | 发布复核通过 | `POST /api/admin/reviews/lots/{id}/approve` | 状态 `公示中`，前台即将拍卖公告可见 | BLOCKED | 拍品状态流转未实现 |
| FLOW-004 | 3.2, 6.2, 12 | 企业提交认证 | `POST /api/enterprises/register` | 状态 `待审核`，材料可供后台复核 | BLOCKED | 企业认证模块未实现 |
| FLOW-005 | 3.2, 5.3 | 管理员审核企业通过 | `POST /api/admin/reviews/enterprises/{id}/approve` | 状态 `审核通过`，企业可提交意向金 | BLOCKED | 企业认证审核未实现 |
| FLOW-006 | 3.3, 4.3, 11.1 | 企业上传意向金凭证 | `POST /api/lots/{id}/deposit-vouchers` | 状态 `待审核`，凭证非公开访问 | BLOCKED | 文件上传与权限控制未实现 |
| FLOW-007 | 3.3, 5.4 | 管理员审核意向金通过 | `POST /api/admin/reviews/deposits/{id}/approve` | 企业获得该拍品竞价资格 | BLOCKED | 意向金资格模块未实现 |
| FLOW-008 | 3.4, 4.4 | 拍品进入竞拍期 | `GET /api/lots` | 状态 `竞拍中`，正在竞价列表可见 | BLOCKED | 定时/状态流转未实现 |
| FLOW-009 | 3.4, 6.3, 10 | 有资格企业合法报价 | `POST /api/lots/{id}/bids` | 出价成功，最高价刷新，记录服务器接收时间 | BLOCKED | 竞价核心未实现 |
| FLOW-010 | 3.4, 8 | 竞拍结束确认中标 | 后台任务或成交生成接口待定 | 最高价企业中标，生成成交/失败通知 | BLOCKED | 竞拍结束任务与通知模块未实现 |
| FLOW-011 | 3.5, 4.6 | 发布成交公示 | `POST /api/admin/results/{id}/publish` | 公开展示成交拍品、中标企业、最终成交价 | BLOCKED | 成交结果模块未实现 |
| FLOW-012 | 3.5, 5.5 | 合同完成 | `POST /api/admin/contracts/{id}/mark-completed` | 合同状态 `已完成`，操作留痕 | BLOCKED | 合同模块未实现 |
| FLOW-013 | 4.1, 3.5, 12 | 数据看板计入 | `GET /api/portal/dashboard` | 只统计合同 `已完成` 的成交量和成交额 | BLOCKED | 看板真实统计口径未实现 |
| FLOW-014 | 3.6, 5.6 | 未中标退款状态登记 | `POST /api/admin/refunds/{id}/mark-reviewing`, `mark-refunded` | 退款状态可流转，不要求退款凭证 | BLOCKED | 退款模块未实现 |

## Exception Coverage

| Case ID | PRD Reference | Scenario | Expected Error/Result | Contract Code | Current Status | Suggested Owner |
|---|---|---|---|---|---|---|
| EX-001 | 10 | 未登录用户报名或报价 | 引导登录或统一错误响应 | `UNAUTHORIZED` | BLOCKED | 后端基础架构 / 前台门户接入 |
| EX-002 | 9, 10 | 未认证企业提交意向金或报价 | 提示先完成企业认证 | `ENTERPRISE_NOT_CERTIFIED` | BLOCKED | 企业入驻与认证 |
| EX-003 | 10 | 认证审核中企业报名 | 提示认证审核中 | `ENTERPRISE_CERTIFICATION_PENDING` | BLOCKED | 企业入驻与认证 |
| EX-004 | 9, 10 | 意向金未审核通过企业报价 | 提示暂无竞价资格 | `DEPOSIT_NOT_APPROVED` | BLOCKED | 意向金凭证与资格 |
| EX-005 | 5.7, 9, 10 | 黑名单企业登录或操作 | 封禁或提示联系平台客服 | `BLACKLISTED` | BLOCKED | 成交合同退款黑名单 |
| EX-006 | 10 | 竞拍已结束后报价 | 报价失败，不生成出价记录 | `AUCTION_ENDED` | BLOCKED | 竞价核心 |
| EX-007 | 3.4, 10 | 报价低于最高价或不符合加价幅度 | 报价失败，不生成出价记录 | `INVALID_BID_INCREMENT` | BLOCKED | 竞价核心 |
| EX-008 | 11.1 | 未授权访问认证材料、付款凭证、检测报告等敏感附件 | 拒绝访问 | `FILE_FORBIDDEN` | BLOCKED | 后端基础架构 / 文件权限 |
| EX-009 | 7.1, 10 | 违约或取消拍品在前台展示 | 前台列表不展示 | N/A | BLOCKED | 成交合同退款黑名单 / 前台门户接入 |

## Reusable Verification Commands

```powershell
Set-Location E:/kuangchan
git status --short

Set-Location E:/kuangchan/frontend
npm run lint
npm run build

Set-Location E:/kuangchan/backend
npm run lint
npm run typecheck
npm test

Set-Location E:/kuangchan
npm run test:e2e
```

## Manual Acceptance Script

在真实 API、数据模型和后台业务模块可用后，按以下顺序执行手工验收：

1. 管理员创建包含 PRD 6.1 必填字段的拍品草稿，确认状态为 `草稿`。
2. 管理员提交发布复核，确认状态为 `待发布复核` 且操作日志存在。
3. 复核通过，确认状态为 `公示中`，前台“即将拍卖公告”可见。
4. 企业 A、企业 B 提交认证，确认各自状态为 `待审核` 且不能互看材料。
5. 管理员审核企业 A、企业 B 通过，确认状态为 `审核通过`。
6. 企业 A、企业 B 上传同一拍品意向金凭证，确认状态为 `待审核` 且凭证无公开访问权限。
7. 管理员审核两家企业意向金通过，确认两家仅获得该拍品竞价资格。
8. 拍品进入竞拍期，确认状态 `竞拍中` 且正在竞价列表可见。
9. 企业 A 提交非法加价，确认返回 `INVALID_BID_INCREMENT` 且无出价记录。
10. 企业 A、企业 B 依次合法报价，确认当前最高价刷新，公开出价记录只显示脱敏企业名称。
11. 竞拍结束后，确认最高价企业中标，生成成交与失败通知。
12. 管理员发布成交公示，确认公开展示成交拍品、中标企业、最终成交价。
13. 管理员将合同从 `待签约` 标记到 `已签约`，再标记 `已完成`。
14. 验证合同完成前数据看板不计入，合同完成后成交量和成交额计入。
15. 管理员登记未中标企业退款状态 `未退款` -> `审核中` -> `已退款`，确认无需退款凭证。
