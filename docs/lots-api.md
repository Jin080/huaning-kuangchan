# 拍品发布与审核 API

本文档记录拍品后台、发布复核和公开查询接口。接口统一挂载在后端全局前缀 `/api` 下。开发阶段后台接口使用请求头鉴权：

- `x-user-id`: 当前管理员用户 ID。
- `x-user-role`: `ADMIN`。

## 状态流转

本模块只处理发布前后的拍品状态：

1. 新建拍品：`DRAFT` / `草稿`。
2. 编辑拍品：保持当前状态，仅更新拍品字段。
3. 提交发布复核：`DRAFT` 或 `RELEASE_REJECTED` 等后台可编辑状态更新为 `PENDING_RELEASE_REVIEW` / `待发布复核`，写入 `releaseSubmittedAt`，清空驳回原因。
4. 发布复核通过：`PENDING_RELEASE_REVIEW` 更新为 `ANNOUNCING` / `公示中`，写入 `releaseReviewedAt`。
5. 发布复核驳回：`PENDING_RELEASE_REVIEW` 更新为 `RELEASE_REJECTED` / `发布驳回`，写入 `releaseRejectReason` 和 `releaseReviewedAt`。
6. 关闭/取消：更新为 `CANCELED` / `已取消`。

公开拍品列表和详情会过滤以下状态：`DRAFT`、`PENDING_RELEASE_REVIEW`、`RELEASE_REJECTED`、`DEFAULTED`、`CANCELED`。

## 后台拍品接口

### `GET /api/admin/lots`

后台拍品列表。

Query:

- `page`: 页码，默认 `1`。
- `pageSize`: 每页数量，默认 `10`。
- `status`: 可选，Prisma `LotStatus` 枚举值。
- `keyword`: 可选，按标题、供应商、产地模糊查询。

Response:

```json
{
  "items": [
    {
      "id": "lot-id",
      "title": "铜精矿竞拍",
      "status": "草稿",
      "statusCode": "DRAFT",
      "startPrice": "1200",
      "quantity": "30.500",
      "depositAmount": "50000",
      "bidIncrement": "100"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### `POST /api/admin/lots`

新建拍品草稿。

Body:

```json
{
  "title": "铜精矿竞拍",
  "imageOneUrl": "https://files.example.com/lot-a.jpg",
  "imageTwoUrl": "https://files.example.com/lot-b.jpg",
  "startPrice": "1200",
  "quantity": "30.5",
  "quantityUnit": "吨",
  "supplier": "华宁供应商",
  "origin": "云南华宁",
  "deadlineAt": "2026-06-02T10:00:00.000Z",
  "deliveryMethod": "自提",
  "productInfo": "铜精矿",
  "productDetail": "铜精矿详情",
  "inspectionReportUrl": "https://files.example.com/report.pdf",
  "email": "auction@example.com",
  "phone": "0871-00000000",
  "mineralCategory": "铜矿",
  "grade": "Cu 20%",
  "assessedPrice": "1500",
  "depositRatio": "0.1000",
  "depositAmount": "50000",
  "bidIncrement": "100",
  "announcementStartAt": "2026-05-20T00:00:00.000Z",
  "announcementEndAt": "2026-05-25T00:00:00.000Z",
  "biddingStartAt": "2026-05-26T00:00:00.000Z",
  "biddingEndAt": "2026-05-27T00:00:00.000Z",
  "customerNotice": "客户须知",
  "extensionEnabled": true,
  "extensionRule": "最后5分钟出价自动延时"
}
```

Response: 拍品详情摘要，`statusCode` 为 `DRAFT`。

### `PUT /api/admin/lots/{id}`

编辑拍品。Body 与新建拍品一致。Response 返回更新后的拍品。

### `POST /api/admin/lots/{id}/submit-review`

提交发布复核。Response 返回更新后的拍品，`statusCode` 为 `PENDING_RELEASE_REVIEW`。

### `POST /api/admin/lots/{id}/close`

关闭/取消拍品。Response 返回更新后的拍品，`statusCode` 为 `CANCELED`。

## 标的发布复核接口

### `GET /api/admin/reviews/lots`

返回所有 `PENDING_RELEASE_REVIEW` / `待发布复核` 拍品。

### `POST /api/admin/reviews/lots/{id}/approve`

复核通过。Response 返回更新后的拍品，`statusCode` 为 `ANNOUNCING`。

### `POST /api/admin/reviews/lots/{id}/reject`

复核驳回。

Body:

```json
{
  "rejectReason": "竞拍时间配置不完整"
}
```

Response 返回更新后的拍品，`statusCode` 为 `RELEASE_REJECTED`，`releaseRejectReason` 为本次驳回原因。

## 公开拍品接口

### `GET /api/lots`

公开拍品列表。自动过滤草稿、待发布复核、发布驳回、违约、已取消。

Query:

- `page`: 页码，默认 `1`。
- `pageSize`: 每页数量，默认 `10`。
- `keyword`: 可选，按标题、供应商、产地模糊查询。

### `GET /api/lots/{id}`

公开拍品详情。若拍品处于禁止前台展示状态，返回 404。

详情额外返回：

- `customerNotice`: 客户须知。
- `auctionRule`: 竞拍规则，包含 `bidIncrement`、竞拍开始/结束时间、延时竞价配置。
- `depositInstruction`: 保证金说明，包含 `depositRatio`、`depositAmount`。
- `attachments`: 拍品附件。
- `inspectionReports`: 检测报告，包含 `Lot.inspectionReportUrl` 和附件表中的 `INSPECTION_REPORT` 文件。

## 测试方式

```powershell
Set-Location E:/kuangchan/backend
npm test -- lots lot-reviews
npm run lint
npm run typecheck
npm test
```
