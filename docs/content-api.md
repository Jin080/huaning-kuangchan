# Content API

本文档记录内容管理与公开说明接口实现。全局接口契约仍以 `docs/api-contract.md` 为准，本文件只补充内容模块的字段、分类和权限细节。

## 分类

资讯分类：

- `POLICY`：政策法规
- `TRADE_ANNOUNCEMENT`：交易公告
- `MINING_NEWS`：矿能动态

公开说明：

- `BLACKLIST_RULES`：用户黑名单管理说明
- `PUBLISH_REVIEW_RULES`：信息发布审核机制
- `AUCTION_RULES`：竞拍规则说明
- `DEPOSIT_RULES`：保证金缴纳与退还说明

## 状态

- `DRAFT`：草稿
- `PUBLISHED`：已发布
- `UNPUBLISHED`：已下架

公开接口只返回 `PUBLISHED` 内容，草稿和已下架内容不会出现在公开列表或公开详情。

## 公开接口

### GET `/api/contents`

查询参数：

- `category`：可选，内容分类枚举。
- `keyword`：可选，按标题、摘要模糊搜索。
- `page`：可选，默认 `1`。
- `pageSize`：可选，默认 `10`，最大 `100`。

响应：

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "竞拍规则说明",
      "category": "AUCTION_RULES",
      "summary": "竞拍规则摘要",
      "body": "正文",
      "status": "PUBLISHED",
      "publishedAt": "2026-05-17T09:00:00.000Z",
      "createdById": "uuid",
      "createdAt": "2026-05-17T08:00:00.000Z",
      "updatedAt": "2026-05-17T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### GET `/api/contents/{id}`

只允许查看已发布内容。内容不存在、草稿或已下架时返回错误。

## 后台接口

后台接口需要管理员请求头：

- `x-user-id`
- `x-user-role: ADMIN`

### GET `/api/admin/contents`

查询参数：

- `category`：可选，内容分类枚举。
- `status`：可选，内容状态枚举。
- `keyword`：可选，按标题、摘要模糊搜索。
- `page`：可选，默认 `1`。
- `pageSize`：可选，默认 `10`，最大 `100`。

### POST `/api/admin/contents`

请求体：

```json
{
  "title": "矿能动态标题",
  "category": "MINING_NEWS",
  "summary": "摘要",
  "body": "正文"
}
```

新建内容默认状态为 `DRAFT`。

### PUT `/api/admin/contents/{id}`

请求体字段同新建接口，均为可选字段。编辑已发布内容不会自动下架。

### POST `/api/admin/contents/{id}/publish`

发布内容，状态变为 `PUBLISHED`，并写入当前 `publishedAt`。

### POST `/api/admin/contents/{id}/unpublish`

下架内容，状态变为 `UNPUBLISHED`。下架后公开接口不可见。
