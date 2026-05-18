# 成交合同退款黑名单 API

接口统一挂载在全局前缀 `/api` 下。后台接口沿用开发阶段请求头：

- `x-user-id`: 当前管理员用户 ID。
- `x-user-role`: `ADMIN`。

## 成交公示

### `GET /api/results`

公开成交公示列表。只返回 `AuctionResult.status = PUBLISHED` 的成交结果。

Query:

- `page`: 默认 `1`。
- `pageSize`: 默认 `10`。

Response:

```json
{
  "items": [
    {
      "id": "result-id",
      "lotId": "lot-id",
      "lotTitle": "铜精矿竞拍",
      "winningEnterpriseId": "enterprise-id",
      "winningEnterpriseName": "华宁铜业有限公司",
      "finalPrice": "1500",
      "status": "已公示",
      "statusCode": "PUBLISHED"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### `GET /api/results/{id}`

公开成交公示详情。未公示结果返回 404。

### `GET /api/admin/results`

后台成交结果列表，可通过 `status=GENERATED|PUBLISHED` 筛选。

### `POST /api/admin/results/{id}/publish`

发布成交公示。

状态流转：

1. `AuctionResult.status` 更新为 `PUBLISHED`。
2. 写入 `publishedAt`。
3. 拍品状态更新为 `PENDING_CONTRACT` / `待签约`。
4. 若合同不存在，创建 `Contract.status = PENDING_SIGN`。
5. 自动为该拍品未中标且意向金凭证已审核通过的企业生成退款初始记录。

退款自动生成规则：

- 查询同一拍品 `DepositVoucher.status = APPROVED` 的意向金凭证。
- 排除 `enterpriseId = winningEnterpriseId` 的中标企业。
- 为剩余企业创建 `Refund.status = NOT_REFUNDED` / `未退款` 记录。
- `Refund.lotId` 为成交拍品，`enterpriseId` 为未中标企业，`depositVoucherId` 关联对应意向金凭证，`amount` 使用该凭证 `requiredAmount`。
- 同一拍品同一企业只保留一条退款记录；重复发布或重复调用不会重复生成。

## 合同

### `GET /api/admin/contracts`

合同状态列表，可通过 `status=PENDING_SIGN|SIGNED|COMPLETED|DEFAULTED` 筛选。

### `POST /api/admin/contracts/{id}/mark-signed`

合同更新为 `SIGNED` / `已签约`，拍品同步更新为 `SIGNED`。

### `POST /api/admin/contracts/{id}/mark-completed`

合同更新为 `COMPLETED` / `已完成`，写入 `completedAt`，拍品同步更新为 `COMPLETED`。

数据看板统计口径：

- 本年成交量：`Contract.status = COMPLETED` 且 `completedAt` 位于本年范围内的合同数量。
- 本年成交额：同上合同关联 `AuctionResult.finalPrice` 求和。
- 累计成交量：所有 `Contract.status = COMPLETED` 的合同数量。
- 累计成交额：所有已完成合同关联 `AuctionResult.finalPrice` 求和。
- 已竞拍结束但合同未完成的拍品不计入成交量和成交额。

### `POST /api/admin/contracts/{id}/mark-defaulted`

合同更新为 `DEFAULTED` / `违约`，写入 `defaultedAt`，拍品同步更新为 `DEFAULTED`。公开拍品列表既有规则会过滤 `DEFAULTED`，因此违约后不再前台展示，也不进入二次竞拍流程。

## 退款

### `GET /api/admin/refunds`

退款状态列表，可通过 `status=NOT_REFUNDED|REVIEWING|REFUNDED` 筛选。

退款响应只包含状态和线下登记信息，不包含退款凭证上传字段。

后台退款待办口径：

- 成交公示发布后自动生成的退款初始记录状态为 `NOT_REFUNDED`。
- 后台管理员通过 `GET /api/admin/refunds?status=NOT_REFUNDED` 查看待处理退款。
- 当前不新增管理员通知 schema，退款待办以未退款记录列表为准。

### `POST /api/admin/refunds/{id}/mark-reviewing`

退款更新为 `REVIEWING` / `审核中`，写入 `reviewedAt`。

### `POST /api/admin/refunds/{id}/mark-refunded`

退款更新为 `REFUNDED` / `已退款`，写入 `refundedAt`。

## 黑名单

### `GET /api/admin/blacklist`

黑名单列表。`releasedAt = null` 表示当前生效。

### `POST /api/admin/blacklist`

手动拉黑企业。

Body:

```json
{
  "enterpriseId": "enterprise-id",
  "lotId": "lot-id",
  "reason": "合同违约"
}
```

处理规则：

1. 创建 `Blacklist` 记录。
2. 设置 `Enterprise.isBlacklisted = true`。
3. 将该企业关联用户更新为 `User.status = BLOCKED`。

`Enterprise.isBlacklisted` 可被认证、意向金和竞价模块复用，用于拒绝敏感操作。

### `POST /api/admin/blacklist/{id}/release`

解除拉黑。

Body:

```json
{
  "releaseReason": "已解除限制"
}
```

处理规则：

1. 写入 `releasedAt`、`releaseReason`、`releaseOperatorId`。
2. 设置 `Enterprise.isBlacklisted = false`。
3. 将该企业关联用户更新为 `User.status = ACTIVE`。

## 通知

### `GET /api/admin/notifications`

查询竞价核心生成的通知记录，可通过 `type=WIN|LOSE` 和 `sendStatus=PENDING|SENT|FAILED` 筛选。

当前实现只读取 `Notification` 记录。短信发送供应商尚未确定，短信渠道保留在 `NotificationChannel.SMS` 和后续发送器接口中，本模块不调用外部短信服务。

## 测试方式

```powershell
Set-Location E:/kuangchan
git status --short

Set-Location E:/kuangchan/backend
npm run lint
npm run typecheck
npm test -- results contracts refunds blacklist notifications
npm test
```
