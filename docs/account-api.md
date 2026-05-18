# 个人中心 API

接口统一挂载在全局前缀 `/api` 下。开发阶段沿用请求头模拟登录态：

- `x-user-id`: 当前用户 ID。
- `x-user-role`: `ENTERPRISE`。

本文件记录企业端个人中心接口，不替代 `docs/api-contract.md`。

## 权限规则

- 仅企业用户可访问个人中心接口。
- 企业用户只能查看当前账号绑定企业的数据。
- 未绑定企业时，个人资料仍返回账号信息；意向金、出价、消息列表返回空列表。
- 消息已读接口只允许操作当前企业自己的通知；其他企业通知按不存在处理。
- `GET /api/account/bids` 可展示本企业真实名称。
- 公开 `GET /api/lots/{id}/bid-records` 仍由竞价模块维护，企业名称保持脱敏。

## `GET /api/account/profile`

返回当前账号、角色与绑定企业信息。

Response:

```json
{
  "id": "user-id",
  "username": "huaning",
  "avatarUrl": null,
  "statusCode": "ACTIVE",
  "roleCode": "ENTERPRISE",
  "roleName": "企业用户",
  "enterprise": {
    "id": "enterprise-id",
    "name": "华宁铜业有限公司",
    "certificationStatus": "审核通过",
    "certificationStatusCode": "APPROVED",
    "isBlacklisted": false
  }
}
```

## `GET /api/account/deposit-vouchers`

返回当前企业自己的意向金记录。

Query:

- `page`: 默认 `1`。
- `pageSize`: 默认 `10`，最大 `100`。

Response:

```json
{
  "items": [
    {
      "id": "voucher-id",
      "lotId": "lot-id",
      "lotTitle": "铜精矿竞拍",
      "enterpriseId": "enterprise-id",
      "requiredAmount": "50000",
      "paidAmount": "50000",
      "status": "审核通过",
      "statusCode": "APPROVED",
      "submittedAt": "2026-05-17T08:00:00.000Z",
      "reviewedAt": null,
      "reviewerId": null,
      "rejectReason": null
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

## `GET /api/account/bids`

返回当前企业自己的出价记录，可展示本企业真实企业名称。

Query:

- `page`: 默认 `1`。
- `pageSize`: 默认 `10`，最大 `100`。

Response:

```json
{
  "items": [
    {
      "id": "bid-id",
      "sequenceNo": 1,
      "lotId": "lot-id",
      "lotTitle": "铜精矿竞拍",
      "enterpriseId": "enterprise-id",
      "enterpriseName": "华宁铜业有限公司",
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

## `GET /api/account/messages`

返回当前企业自己的站内通知。

Query:

- `page`: 默认 `1`。
- `pageSize`: 默认 `10`，最大 `100`。

Response:

```json
{
  "items": [
    {
      "id": "message-id",
      "type": "成交通知",
      "typeCode": "WIN",
      "channel": "站内消息",
      "channelCode": "IN_APP",
      "receiverEnterpriseId": "enterprise-id",
      "lotId": "lot-id",
      "lotTitle": "铜精矿竞拍",
      "content": "您参与的铜精矿竞拍已结束，已中标，请办理签约与尾款手续。",
      "sendStatus": "待发送",
      "sendStatusCode": "PENDING",
      "sentAt": null,
      "readAt": null,
      "createdAt": "2026-05-17T10:00:00.000Z",
      "updatedAt": "2026-05-17T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

## `POST /api/account/messages/{id}/read`

将当前企业自己的通知标记为已读。

处理规则：

- 仅按 `id + receiverEnterpriseId` 查找通知。
- 通知不存在或属于其他企业时返回 404。
- 已读通知重复调用时直接返回当前通知，不重复改写 `readAt`。
- 本接口不修改 `sendStatus`。

Response:

```json
{
  "id": "message-id",
  "type": "成交通知",
  "typeCode": "WIN",
  "channel": "站内消息",
  "channelCode": "IN_APP",
  "receiverEnterpriseId": "enterprise-id",
  "lotId": "lot-id",
  "lotTitle": "铜精矿竞拍",
  "content": "您参与的铜精矿竞拍已结束，已中标，请办理签约与尾款手续。",
  "sendStatus": "待发送",
  "sendStatusCode": "PENDING",
  "sentAt": null,
  "readAt": "2026-05-17T10:05:00.000Z",
  "createdAt": "2026-05-17T10:00:00.000Z",
  "updatedAt": "2026-05-17T10:05:00.000Z"
}
```

## 测试方式

```powershell
Set-Location E:/kuangchan
git status --short

Set-Location E:/kuangchan/backend
npm run lint
npm run typecheck
npm test -- account
npm test
```
