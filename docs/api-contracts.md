# API Contracts Draft

This document is the integration control draft for frontend and backend sessions. PRD takes precedence over frontend mock data.

## Current Assumptions

- Backend package and Prisma schema are not present yet, so all backend paths below are contract targets, not implemented evidence.
- `frontend/src/services/api.ts` is the intended frontend replacement point. Page components should stay mostly unchanged during API switching.
- Frontend mock fields are display-oriented strings. Backend should return typed values where possible, and the frontend adapter may format them for display.
- PRD uses both "意向金" and "保证金" in the same flow. Contract naming should use `deposit` for this module unless backend/data-model session defines a stricter term.
- Contract status should be modeled separately from lot status, even though PRD lists some contract states under lot status.

## Unified Response Shape

List response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

Mutation response:

```json
{
  "success": true,
  "message": "操作成功"
}
```

Recommended error response:

```json
{
  "success": false,
  "code": "DEPOSIT_NOT_APPROVED",
  "message": "暂无竞价资格"
}
```

Required error coverage:

- `UNAUTHORIZED`: 未登录。
- `ENTERPRISE_NOT_CERTIFIED`: 企业未认证。
- `ENTERPRISE_CERTIFICATION_PENDING`: 企业认证审核中。
- `DEPOSIT_NOT_APPROVED`: 意向金未审核通过。
- `BLACKLISTED`: 被拉黑。
- `AUCTION_ENDED`: 竞拍已结束。
- `INVALID_BID_INCREMENT`: 报价不符合加价规则。
- `FILE_FORBIDDEN`: 附件无查看权限。

## Status Enums

Lot status:

- `草稿`
- `待发布复核`
- `发布驳回`
- `公示中`
- `竞拍中`
- `已结束`
- `成交公示中`
- `待签约`
- `已签约`
- `已完成`
- `违约`
- `已取消`

Frontend-hidden lot status:

- `草稿`
- `待发布复核`
- `发布驳回`
- `违约`
- `已取消`

Enterprise certification status:

- `未提交`
- `待审核`
- `审核通过`
- `审核驳回`

Deposit status:

- `未提交`
- `待审核`
- `审核通过`
- `审核驳回`

Contract status:

- `待签约`
- `已签约`
- `已完成`
- `违约`

Refund status:

- `未退款`
- `审核中`
- `已退款`

Notification type:

- `成交通知`
- `失败通知`

Notification channel:

- `站内消息`
- `短信`

Content category:

- `政策法规`
- `交易公告`
- `矿能动态`
- `用户黑名单管理说明`
- `信息发布审核机制`
- `竞拍规则说明`
- `保证金缴纳与退还说明`

## Route And API Map

### Auth And Account

| Method | Path | Purpose | Frontend consumer |
|---|---|---|---|
| `POST` | `/api/auth/login` | 企业/管理员登录 | `/login` |
| `POST` | `/api/auth/logout` | 退出登录 | 全局 |
| `GET` | `/api/account/profile` | 当前用户与角色 | 路由守卫、个人中心 |
| `POST` | `/api/enterprises/register` | 企业入驻提交 | `/enterprise/register` |
| `GET` | `/api/account/certification` | 我的企业认证 | `/account/certification` |
| `PUT` | `/api/account/certification` | 修改后重新提交认证 | `/account/certification` |

### Portal And Lots

| Method | Path | Purpose | Frontend consumer |
|---|---|---|---|
| `GET` | `/api/portal/dashboard` | 首页/后台统计 | `/`, `/admin/dashboard` |
| `GET` | `/api/lots` | 公开拍品列表，按状态筛选 | `/announcements/upcoming`, `/auctions/live` |
| `GET` | `/api/lots/{id}` | 拍品详情 | 公告详情、竞价详情 |
| `GET` | `/api/lots/{id}/attachments` | 拍品附件、检测报告 | 详情页 |
| `GET` | `/api/lots/{id}/bid-records` | 全部出价记录，企业名脱敏 | 竞价详情 |
| `POST` | `/api/lots/{id}/deposit-vouchers` | 上传意向金付款凭证 | 公告详情 |
| `POST` | `/api/lots/{id}/bids` | 竞价报价 | 竞价详情 |

### Admin Review And Lot Management

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/lots` | 后台拍品列表 |
| `POST` | `/api/admin/lots` | 新建拍品 |
| `PUT` | `/api/admin/lots/{id}` | 编辑拍品 |
| `POST` | `/api/admin/lots/{id}/submit-review` | 提交发布复核 |
| `POST` | `/api/admin/lots/{id}/close` | 关闭/取消拍品 |
| `GET` | `/api/admin/reviews/lots` | 待复核标的 |
| `POST` | `/api/admin/reviews/lots/{id}/approve` | 标的复核通过 |
| `POST` | `/api/admin/reviews/lots/{id}/reject` | 标的复核驳回 |
| `GET` | `/api/admin/reviews/enterprises` | 企业认证复核列表 |
| `POST` | `/api/admin/reviews/enterprises/{id}/approve` | 企业认证通过 |
| `POST` | `/api/admin/reviews/enterprises/{id}/reject` | 企业认证驳回 |
| `GET` | `/api/admin/reviews/deposits` | 意向金复核列表 |
| `POST` | `/api/admin/reviews/deposits/{id}/approve` | 意向金通过 |
| `POST` | `/api/admin/reviews/deposits/{id}/reject` | 意向金驳回 |

### Trade, Result, Contract, Refund

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/bids` | 后台出价记录 |
| `GET` | `/api/results` | 公开成交公示列表 |
| `GET` | `/api/results/{id}` | 成交公示详情 |
| `GET` | `/api/admin/results` | 后台成交结果 |
| `POST` | `/api/admin/results/{id}/publish` | 发布成交公示 |
| `GET` | `/api/admin/contracts` | 合同状态列表 |
| `POST` | `/api/admin/contracts/{id}/mark-signed` | 标记已签约 |
| `POST` | `/api/admin/contracts/{id}/mark-completed` | 标记已完成 |
| `POST` | `/api/admin/contracts/{id}/mark-defaulted` | 标记违约 |
| `GET` | `/api/admin/refunds` | 退款状态列表 |
| `POST` | `/api/admin/refunds/{id}/mark-reviewing` | 标记审核中 |
| `POST` | `/api/admin/refunds/{id}/mark-refunded` | 标记已退款 |

### Content, Notification, Files, Logs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/contents` | 公开资讯与说明列表 |
| `GET` | `/api/contents/{id}` | 资讯/说明详情 |
| `GET` | `/api/admin/contents` | 内容管理列表 |
| `POST` | `/api/admin/contents` | 新建内容 |
| `PUT` | `/api/admin/contents/{id}` | 编辑内容 |
| `POST` | `/api/admin/contents/{id}/publish` | 发布内容 |
| `POST` | `/api/admin/contents/{id}/unpublish` | 下架内容 |
| `GET` | `/api/admin/notifications` | 通知发送记录 |
| `GET` | `/api/account/messages` | 我的通知 |
| `POST` | `/api/account/messages/{id}/read` | 标记已读 |
| `GET` | `/api/admin/files` | 文件管理 |
| `GET` | `/api/admin/logs` | 操作日志 |
| `GET` | `/api/admin/blacklist` | 黑名单列表 |
| `POST` | `/api/admin/blacklist` | 手动拉黑 |
| `POST` | `/api/admin/blacklist/{id}/release` | 解除拉黑 |

## Field Groups

### Lot

Required PRD fields:

- `id`
- `imageOne`
- `imageTwo`
- `title`
- `startPrice`
- `quantity`
- `supplier`
- `origin`
- `deadlineAt`
- `deliveryMethod`
- `description`
- `inspectionReportFileId`
- `email`

Optional reserved fields:

- `phone`

Auction config fields:

- `evaluatedPrice`
- `depositRatio`
- `depositAmount`
- `bidIncrement`
- `publicityStartAt`
- `publicityEndAt`
- `auctionStartAt`
- `auctionEndAt`
- `customerNotice`
- `extensionEnabled`
- `extensionRule`
- `status`

Frontend display-only adapter fields currently used:

- `currentPrice`
- `category`
- `publicityPeriod`
- `auctionTime`
- `countdown`
- `updatedAt`

### Enterprise Certification

- `username`
- `password`
- `avatarFileId`
- `enterpriseName`
- `contactName`
- `contactPhone`
- `mainCategory`
- `legalRepresentative`
- `legalIdNumber`
- `email`
- `userCategory`
- `userType`
- `registeredCapital`
- `region`
- `address`
- `unifiedSocialCreditCode`
- `companyProfile`
- `businessScope`
- `qualificationFileIds`
- `businessLicenseFileId`
- `paymentBankAccount`
- `paymentAccountName`
- `paymentBankName`
- `paymentBankRoutingNumber`
- `paymentBankIsBoc`
- `receiptBankAccount`
- `receiptAccountName`
- `receiptBankName`
- `receiptBankRoutingNumber`
- `receiptBankIsBoc`
- `captcha`
- `agreementAccepted`
- `status`
- `rejectReason`

### Deposit Voucher

- `id`
- `lotId`
- `enterpriseId`
- `amount`
- `voucherFileId`
- `status`
- `submittedAt`
- `reviewedAt`
- `reviewerId`
- `rejectReason`

### Bid Record

- `sequence`
- `lotId`
- `enterpriseId`
- `enterpriseName`
- `maskedEnterpriseName`
- `amount`
- `incrementTimes`
- `bidAt`
- `isCurrentHighest`

### Result, Contract, Refund

Result:

- `id`
- `lotId`
- `lotTitle`
- `winnerEnterpriseId`
- `winnerEnterpriseName`
- `finalPrice`
- `generatedAt`
- `publicAt`
- `status`

Contract:

- `id`
- `resultId`
- `lotId`
- `enterpriseId`
- `amount`
- `status`
- `completedAt`
- `defaultReason`
- `updatedAt`
- `operatorId`

Refund:

- `id`
- `lotId`
- `enterpriseId`
- `amount`
- `status`
- `updatedAt`
- `operatorId`

### Notification

- `id`
- `type`
- `channel`
- `receiverEnterpriseId`
- `lotId`
- `lotTitle`
- `content`
- `sendStatus`
- `sentAt`
- `readAt`

## Main Flow Acceptance Contract

1. Admin creates lot draft and submits review.
2. Admin approves lot review; lot enters `公示中` and appears in `/api/lots?status=公示中`.
3. Enterprise registers and submits certification; admin approves certification.
4. Certified enterprise uploads deposit voucher for the lot; admin approves it.
5. Lot enters `竞拍中`; approved enterprise can post bids; unqualified enterprise receives `DEPOSIT_NOT_APPROVED`.
6. Auction ends; system confirms highest bid, creates result, sends winner and loser notifications.
7. Admin publishes result and records contract status.
8. Only when contract status becomes `已完成`, the result contributes to `/api/portal/dashboard`.
9. Admin records loser refunds; no refund voucher is required.
10. If contract is marked `违约`, lot is hidden from frontend and enterprise may be blacklisted.
