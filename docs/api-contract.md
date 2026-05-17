# API Contract

PRD 优先于前端 mock。本文件由总控维护；模块会话如需变更接口，先在 `agent-handoff.md` 说明，由总控合并。

## 统一响应

列表响应：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

操作响应：

```json
{
  "success": true,
  "message": "操作成功"
}
```

错误响应：

```json
{
  "success": false,
  "code": "DEPOSIT_NOT_APPROVED",
  "message": "暂无竞价资格"
}
```

## 错误码

| Code | Message |
|---|---|
| `UNAUTHORIZED` | 未登录 |
| `ENTERPRISE_NOT_CERTIFIED` | 企业未认证 |
| `ENTERPRISE_CERTIFICATION_PENDING` | 企业认证审核中 |
| `DEPOSIT_NOT_APPROVED` | 意向金未审核通过 |
| `BLACKLISTED` | 被拉黑，请联系平台客服 |
| `AUCTION_ENDED` | 竞拍已结束 |
| `INVALID_BID_INCREMENT` | 报价不符合加价规则 |
| `FILE_FORBIDDEN` | 附件无查看权限 |

## 状态枚举

拍品状态：

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

企业认证状态：

- `未提交`
- `待审核`
- `审核通过`
- `审核驳回`

意向金状态：

- `未提交`
- `待审核`
- `审核通过`
- `审核驳回`

合同状态：

- `待签约`
- `已签约`
- `已完成`
- `违约`

退款状态：

- `未退款`
- `审核中`
- `已退款`

通知类型：

- `成交通知`
- `失败通知`

通知渠道：

- `站内消息`
- `短信`

## 接口清单

### 认证与账号

| Method | Path | 用途 |
|---|---|---|
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 退出 |
| `GET` | `/api/account/profile` | 当前账号与角色 |
| `POST` | `/api/enterprises/register` | 企业入驻提交 |
| `GET` | `/api/account/certification` | 我的企业认证 |
| `PUT` | `/api/account/certification` | 修改/重新提交认证 |

### 门户与拍品

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/portal/dashboard` | 数据看板 |
| `GET` | `/api/lots` | 公开拍品列表 |
| `GET` | `/api/lots/{id}` | 拍品详情 |
| `GET` | `/api/lots/{id}/attachments` | 附件与检测报告 |
| `GET` | `/api/lots/{id}/bid-records` | 公开出价记录，企业名称脱敏 |
| `POST` | `/api/lots/{id}/deposit-vouchers` | 上传意向金付款凭证 |
| `POST` | `/api/lots/{id}/bids` | 出价 |

### 后台拍品与审核

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/admin/lots` | 后台拍品列表 |
| `POST` | `/api/admin/lots` | 新建拍品 |
| `PUT` | `/api/admin/lots/{id}` | 编辑拍品 |
| `POST` | `/api/admin/lots/{id}/submit-review` | 提交发布复核 |
| `POST` | `/api/admin/lots/{id}/close` | 关闭/取消 |
| `GET` | `/api/admin/reviews/lots` | 标的发布复核列表 |
| `POST` | `/api/admin/reviews/lots/{id}/approve` | 标的复核通过 |
| `POST` | `/api/admin/reviews/lots/{id}/reject` | 标的复核驳回 |
| `GET` | `/api/admin/reviews/enterprises` | 企业认证审核列表 |
| `POST` | `/api/admin/reviews/enterprises/{id}/approve` | 企业认证通过 |
| `POST` | `/api/admin/reviews/enterprises/{id}/reject` | 企业认证驳回 |
| `GET` | `/api/admin/reviews/deposits` | 意向金审核列表 |
| `POST` | `/api/admin/reviews/deposits/{id}/approve` | 意向金审核通过 |
| `POST` | `/api/admin/reviews/deposits/{id}/reject` | 意向金审核驳回 |

### 交易、成交、合同、退款

| Method | Path | 用途 |
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

### 内容、通知、文件、日志

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/contents` | 公开资讯/说明列表 |
| `GET` | `/api/contents/{id}` | 资讯/说明详情 |
| `GET` | `/api/admin/contents` | 内容管理列表 |
| `POST` | `/api/admin/contents` | 新建内容 |
| `PUT` | `/api/admin/contents/{id}` | 编辑内容 |
| `POST` | `/api/admin/contents/{id}/publish` | 发布内容 |
| `POST` | `/api/admin/contents/{id}/unpublish` | 下架内容 |
| `GET` | `/api/admin/notifications` | 通知记录 |
| `GET` | `/api/account/messages` | 我的通知 |
| `POST` | `/api/account/messages/{id}/read` | 标记已读 |
| `GET` | `/api/admin/files` | 文件管理 |
| `GET` | `/api/admin/logs` | 操作日志 |
| `GET` | `/api/admin/blacklist` | 黑名单列表 |
| `POST` | `/api/admin/blacklist` | 手动拉黑 |
| `POST` | `/api/admin/blacklist/{id}/release` | 解除拉黑 |

## 数据字段基线

- 拍品必填：图一、图二、拍品标题、单价/起拍价、数量、供应商、产地、截止日期、发货方式、商品信息/商品详情、检测报告、电子邮箱。
- 拍品预留：联系电话。
- 拍品竞价配置：评估价、保证金比例、保证金金额、加价幅度、公示开始/结束时间、竞拍开始/结束时间、客户须知、是否启用延时竞价、延时竞价规则说明。
- 企业认证字段以 PRD 6.2 为准。
- 出价记录字段以 PRD 6.3 为准。
- 通知字段以 PRD 6.4 为准。

## 待确认

- `意向金` 与 `保证金` 是否在数据库/API 命名中统一为 `deposit`。
- `待签约`、`已签约`、`已完成`、`违约` 是否作为拍品状态持久化，还是由合同状态派生。
- 成交结果状态是否采用前端 mock 的 `已生成`、`已公示`。
- 内容状态是否采用 `草稿`、`已发布`、`已下架`。
