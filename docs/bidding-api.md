# Bidding API

本文档记录竞价核心 API。接口统一挂载在全局前缀 `/api` 下，开发阶段继续使用请求头模拟登录态：

- `x-user-id`: 当前用户 ID。
- `x-user-role`: `ENTERPRISE` 或 `ADMIN`。

## 接口

### `POST /api/lots/{id}/bids`

企业报价接口，仅允许 `ENTERPRISE` 调用。

Request:

```json
{
  "amount": "1300"
}
```

Response:

```json
{
  "id": "bid-id",
  "sequenceNo": 1,
  "lotId": "lot-id",
  "enterpriseId": "enterprise-id",
  "enterpriseName": "华宁铜业有限公司",
  "maskedEnterpriseName": "华***司",
  "amount": "1300",
  "incrementCount": 1,
  "bidAt": "2026-05-17T09:00:00.000Z",
  "isCurrentHighest": true,
  "currentHighestPrice": "1300"
}
```

校验规则：

- 未登录：`UNAUTHORIZED`。
- 企业认证待审核：`ENTERPRISE_CERTIFICATION_PENDING`。
- 企业认证未通过或未绑定企业：`ENTERPRISE_NOT_CERTIFIED`。
- 企业被拉黑：`BLACKLISTED`。
- 意向金资格未通过：`DEPOSIT_NOT_APPROVED`。
- 拍品不存在：404，message 为 `拍品不存在`。
- 拍品状态不是 `BIDDING` 或服务器接收时间不在竞拍期：`AUCTION_ENDED`。
- 报价不高于当前基准价，或差额不是 `bidIncrement` 的整数倍：`INVALID_BID_INCREMENT`。

资格判断必须复用 `DepositsService.hasBiddingQualification(enterpriseId, lotId)`。竞价模块只负责拍品状态、竞拍时间和报价规则。

### `GET /api/lots/{id}/bid-records`

公开出价记录接口，不要求登录。企业名称只返回脱敏值。

Query:

- `page`: 默认 `1`。
- `pageSize`: 默认 `10`。

Response:

```json
{
  "items": [
    {
      "id": "bid-id",
      "sequenceNo": 1,
      "lotId": "lot-id",
      "enterpriseName": "华***司",
      "maskedEnterpriseName": "华***司",
      "amount": "1300",
      "incrementCount": 1,
      "bidAt": "2026-05-17T09:00:00.000Z",
      "isCurrentHighest": true
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### `GET /api/admin/bids`

后台出价记录接口，仅允许 `ADMIN` 调用，可查看真实企业信息。

Query:

- `page`: 默认 `1`。
- `pageSize`: 默认 `10`。
- `lotId`: 可选，按拍品筛选。
- `enterpriseId`: 可选，按企业筛选。

## 状态流转

报价成功后：

1. 以服务器接收时间生成 `bidAt`。
2. 读取事务内最新 `Lot.currentHighestPrice`；若为空，基准价为 `Lot.startPrice`。
3. 将同拍品上一条当前最高价记录更新为 `isCurrentHighest = false`。
4. 创建新的 `BidRecord`，写入 `sequenceNo`、企业真实名称、脱敏名称、报价金额、加价次数、`bidAt`、`isCurrentHighest = true`。
5. 更新 `Lot.currentHighestPrice`。

竞拍截止后由 `AuctionClosingService.closeEndedAuctions()` 处理：

1. 查找 `status = BIDDING` 且 `biddingEndAt < now` 的拍品。
2. 若无出价，将拍品状态更新为 `ENDED`。
3. 若已有 `AuctionResult`，跳过，避免重复生成。
4. 若有最高价，创建 `AuctionResult`，状态为 `GENERATED`。
5. 将拍品状态推进到 `RESULT_ANNOUNCING`。
6. 为参与企业创建站内通知待发送记录：最高价企业为 `WIN`，其他企业为 `LOSE`，`sendStatus = PENDING`。

## 并发与顺序策略

- 报价顺序以服务端生成的 `bidAt` 为准。
- 报价创建、上一条最高价失效、拍品当前最高价更新在一个 Prisma 事务内完成。
- 后到请求会在事务内读取最新最高价；若报价未超过最新基准价或不符合加价幅度，会被 `INVALID_BID_INCREMENT` 拒绝。
- 当前实现未增加数据库级行锁；如后续出现高并发竞拍要求，建议在总控确认后引入 PostgreSQL advisory lock 或原生 SQL `SELECT ... FOR UPDATE`。

## 延时竞价缺口

Prisma schema 目前只有 `extensionEnabled` 和文本 `extensionRule`，没有延时窗口、延时时长或最大延时次数等结构化字段。本次按要求实现非延时主流程；若需要自动延时，应由数据模型/总控先确认结构化规则字段，再由竞价模块接入。

## 通知交接点

本次仅创建 `Notification` 基础记录，渠道为 `IN_APP`，发送状态为 `PENDING`。短信供应商和实际发送任务由后续通知/个人中心会话接入。

## 测试方式

```powershell
Set-Location E:/kuangchan/backend
npm test -- bids auction-closing
npm run lint
npm run typecheck
npm test
```
