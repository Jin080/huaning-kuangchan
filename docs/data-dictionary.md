# 数据字典

本文档记录华宁矿产竞拍平台 Prisma 数据模型、状态枚举和统计口径。数据库固定使用 PostgreSQL，金额字段使用 `Decimal`，不使用普通浮点。

## 状态枚举

| Prisma 枚举 | 中文值 | 用途 |
|---|---|---|
| `RoleCode` | 管理员、企业用户 | 用户角色 |
| `UserStatus` | 启用、封禁 | 账号状态，被拉黑企业账号可封禁 |
| `LotStatus` | 草稿、待发布复核、发布驳回、公示中、竞拍中、已结束、成交公示中、待签约、已签约、已完成、违约、已取消 | 拍品全生命周期 |
| `EnterpriseCertificationStatus` | 未提交、待审核、审核通过、审核驳回 | 企业认证 |
| `DepositVoucherStatus` | 未提交、待审核、审核通过、审核驳回 | 意向金凭证审核 |
| `ContractStatus` | 待签约、已签约、已完成、违约 | 合同状态 |
| `RefundStatus` | 未退款、审核中、已退款 | 未中标企业退款登记 |
| `NotificationType` | 成交通知、失败通知 | 竞拍结束通知类型 |
| `NotificationChannel` | 站内消息、短信 | 通知渠道 |
| `NotificationSendStatus` | 待发送、已发送、发送失败 | 通知发送状态 |
| `AttachmentCategory` | 拍品图片、检测报告、企业资质、营业执照、意向金凭证、内容图片、其他 | 附件分类与权限判断 |
| `AuctionResultStatus` | 已生成、已公示 | 成交结果发布状态 |
| `ContentCategory` | 政策法规、交易公告、矿能动态、用户黑名单管理说明、信息发布审核机制、竞拍规则说明、保证金缴纳与退还说明 | 内容分类 |
| `ContentStatus` | 草稿、已发布、已下架 | 内容上下架状态 |
| `OperationLogAction` | 创建、更新、提交审核、审核通过、审核驳回、关闭、出价、发布、标记已签约、标记已完成、标记违约、标记退款审核中、标记已退款、拉黑、解除拉黑、登录、退出 | 操作日志动作 |

## 核心模型

### `Role`

角色表。通过 `code` 区分管理员和企业用户，供认证与权限模块复用。

### `User`

账号表。保存 `username`、`passwordHash`、`avatarUrl`、`status`、`roleId`、`enterpriseId`。企业用户通过 `enterpriseId` 关联企业，管理员可为空。

### `Enterprise`

企业与认证资料表。覆盖 PRD 6.2 的企业名、联系人、联系电话、主营分类、法人代表、身份证号、电子邮件、用户类别、用户类型、注册资本、所属区域、详细地址、统一社会信用代码、公司简介、经营范围、付款/收款银行账户信息、是否中行、入驻协议确认。

认证字段包括 `certificationStatus`、`certificationSubmittedAt`、`certificationReviewedAt`、`certificationReviewerId`、`certificationRejectReason`。黑名单入口字段为 `isBlacklisted`，详细记录见 `Blacklist`。

### `Lot`

拍品表。覆盖 PRD 6.1 的图一、图二、拍品标题、起拍价、数量、供应商、产地、截止日期、发货方式、商品信息/详情、检测报告、电子邮箱、联系电话、评估价、保证金比例、保证金金额、加价幅度、公示开始/结束时间、竞拍开始/结束时间、客户须知、延时竞价配置。

关键金额字段：`startPrice`、`assessedPrice`、`depositAmount`、`bidIncrement`、`currentHighestPrice` 均为 `Decimal`。关键时间字段：`deadlineAt`、`announcementStartAt`、`announcementEndAt`、`biddingStartAt`、`biddingEndAt`。

### `Attachment`

附件表。通过 `category` 区分拍品图片、检测报告、企业资质、营业执照、意向金凭证等。通过 `isSensitive` 标记企业认证资料、付款凭证等需要权限控制的附件。

### `DepositVoucher`

意向金凭证表。按 `lotId + enterpriseId` 唯一，保存凭证附件、应缴金额、实缴金额、审核状态、提交时间、审核人、审核时间和驳回原因。审核通过后表示企业获得对应拍品竞价资格。

### `BidRecord`

出价记录表。覆盖 PRD 6.3 的出价序号、拍品 ID、企业 ID、企业名称、脱敏企业名称、出价金额、加价次数、出价时间、是否当前最高价。`amount` 使用 `Decimal`，`bidAt` 使用服务器接收时间。

### `AuctionResult`

成交结果表。竞拍结束后生成，保存拍品、中标企业、最终成交价、生成时间、公示状态和公示时间。成交公示公开展示 `lot`、`winningEnterprise`、`finalPrice`。

### `Contract`

合同表。保存成交结果、拍品、企业、合同状态、签约时间、完成时间、违约时间。数据看板只统计 `status = COMPLETED` 且 `completedAt` 落在统计区间内的记录。

### `Refund`

退款登记表。保存未中标企业的退款金额、退款状态、审核时间、退款时间。系统不要求上传退款凭证。

### `Blacklist`

黑名单记录表。保存企业、关联拍品、拉黑原因、拉黑操作人、拉黑时间、解除时间、解除原因和解除操作人。当前是否生效可按 `releasedAt IS NULL` 判断。

### `Content`

内容表。支撑政策法规、交易公告、矿能动态和四类公开说明页。字段包括标题、分类、摘要、正文、状态、发布时间、创建人、创建/更新时间。

### `Notification`

通知表。覆盖 PRD 6.4 的通知类型、通知渠道、接收企业、拍品名称、通知内容、发送状态、发送时间。另保留 `readAt` 支撑个人中心已读状态。

### `OperationLog`

操作日志表。记录操作人、动作、对象类型、对象 ID、摘要、IP、User-Agent、创建时间。关键审核、合同、退款、拉黑和报价动作应写入该表。

## 数据看板统计口径

本年成交量：`Contract.status = COMPLETED` 且 `Contract.completedAt` 位于本年范围内的合同数量。

本年成交额：同上合同关联 `AuctionResult.finalPrice` 求和。

累计成交量：所有 `Contract.status = COMPLETED` 的合同数量。

累计成交额：所有已完成合同关联 `AuctionResult.finalPrice` 求和。

已竞拍结束但合同未完成的拍品不计入成交量和成交额。

## Seed 数据

`backend/prisma/seed.ts` 建立以下基础数据：

- 管理员角色与 `admin` 管理员账号。
- 企业用户角色、示例企业和 `enterprise_demo` 企业账号。
- 一个公示中拍品示例。
- 用户黑名单管理说明、信息发布审核机制、竞拍规则说明、保证金缴纳与退还说明四类公开说明内容。
