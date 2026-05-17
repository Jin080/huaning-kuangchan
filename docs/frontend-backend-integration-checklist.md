# 华宁矿产竞拍平台前后端接入清单

## 1. 前端工程

- 工程目录：`frontend`
- 技术栈：React + TypeScript + Vite
- 当前数据来源：`frontend/src/services/api.ts` 调用 `frontend/src/data/mock.ts`
- 接口替换点：后端接口确定后，优先替换 `api.ts`，页面组件尽量不改。

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

- `GET /api/portal/dashboard`
- `GET /api/lots`
- `GET /api/lots/{id}`
- `GET /api/lots/{id}/attachments`
- `GET /api/lots/{id}/bid-records`
- `POST /api/lots/{id}/deposit-vouchers`
- `POST /api/lots/{id}/bids`

### 后台拍品与审核

- `GET /api/admin/lots`
- `POST /api/admin/lots`
- `PUT /api/admin/lots/{id}`
- `POST /api/admin/lots/{id}/submit-review`
- `POST /api/admin/lots/{id}/close`
- `GET /api/admin/reviews/lots`
- `POST /api/admin/reviews/lots/{id}/approve`
- `POST /api/admin/reviews/lots/{id}/reject`
- `GET /api/admin/reviews/enterprises`
- `POST /api/admin/reviews/enterprises/{id}/approve`
- `POST /api/admin/reviews/enterprises/{id}/reject`
- `GET /api/admin/reviews/deposits`
- `POST /api/admin/reviews/deposits/{id}/approve`
- `POST /api/admin/reviews/deposits/{id}/reject`

### 交易、成交、合同、退款

- `GET /api/admin/bids`
- `GET /api/results`
- `GET /api/results/{id}`
- `GET /api/admin/results`
- `POST /api/admin/results/{id}/publish`
- `GET /api/admin/contracts`
- `POST /api/admin/contracts/{id}/mark-signed`
- `POST /api/admin/contracts/{id}/mark-completed`
- `POST /api/admin/contracts/{id}/mark-defaulted`
- `GET /api/admin/refunds`
- `POST /api/admin/refunds/{id}/mark-reviewing`
- `POST /api/admin/refunds/{id}/mark-refunded`

### 企业管理、内容、通知、文件、日志

- `GET /api/admin/blacklist`
- `POST /api/admin/blacklist`
- `POST /api/admin/blacklist/{id}/release`
- `GET /api/contents`
- `GET /api/contents/{id}`
- `GET /api/admin/contents`
- `POST /api/admin/contents`
- `PUT /api/admin/contents/{id}`
- `POST /api/admin/contents/{id}/publish`
- `POST /api/admin/contents/{id}/unpublish`
- `GET /api/admin/notifications`
- `GET /api/account/messages`
- `POST /api/account/messages/{id}/read`
- `GET /api/admin/files`
- `GET /api/admin/logs`

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
