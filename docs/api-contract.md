# API Contract

PRD 优先于前端 mock。本文件由总控维护；模块会话如需变更接口，先在 `agent-handoff.md` 说明，由总控合并。

## 统一响应

## 认证约定

正式认证入口为 `Authorization: Bearer <accessToken>`。`accessToken` 由 `POST /api/auth/login` 返回，当前为 HS256 JWT，载荷以服务端实时用户、角色和企业绑定状态为准；服务端不信任客户端传入的角色。

开发阶段仍保留请求头模拟登录态，仅限本地开发和历史联调脚本使用，不得作为生产入口。该模式必须同时显式开启后端 `DEV_AUTH_HEADERS_ENABLED=true` 与前端 `VITE_DEV_AUTH_HEADERS_ENABLED=true`，默认关闭：

- `x-user-id`: 当前用户 ID。
- `x-user-role`: 当前用户角色，固定取值为 `ADMIN` 或 `ENTERPRISE`。

业务会话不得自行发明其他角色请求头或角色字符串。请求同时包含 Bearer JWT 与开发头时，后端优先使用 Bearer JWT。默认环境下，无 Bearer token 或仅带开发头访问受保护接口均应返回 `401 UNAUTHORIZED`；角色不满足接口要求返回 `403 FORBIDDEN`。

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
| `FORBIDDEN` | 无权访问 |
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
| `GET` | `/api/account/contracts` | 我的成交合同与合同附件 |

`POST /api/auth/login` 请求：

```json
{
  "username": "enterprise_demo",
  "password": "enterprise123456"
}
```

成功响应：

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "username": "enterprise_demo",
    "role": "ENTERPRISE"
  },
  "profile": {
    "id": "uuid",
    "username": "enterprise_demo",
    "avatarUrl": null,
    "statusCode": "ACTIVE",
    "roleCode": "ENTERPRISE",
    "roleName": "企业用户",
    "enterprise": {
      "id": "uuid",
      "name": "华宁示例矿业有限公司",
      "certificationStatusCode": "APPROVED",
      "isBlacklisted": false
    }
  }
}
```

登录失败口径：用户名不存在或密码错误返回 `401 UNAUTHORIZED`；用户禁用返回 `403 FORBIDDEN`；企业用户未绑定有效企业返回 `403 FORBIDDEN`。Bearer 访问受保护接口时，token 无效/过期或用户不存在返回 `401`，用户禁用、企业不存在、角色不满足接口要求返回 `403`，token 签发后角色变化返回 `401` 要求重新登录。

`POST /api/auth/logout` 当前为最小退出接口，携带有效 Bearer JWT 后返回：

```json
{
  "success": true,
  "message": "退出成功"
}
```

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

出价口径：竞价详情页由用户选择“出价加价次数”，前端按 `当前最高价（无出价时为起拍价） + 出价加价次数 × 加价幅度` 计算 `amount`，并继续提交到现有 `POST /api/lots/{id}/bids`。接口请求字段不新增；后端仍以 `amount` 为准校验报价必须高于当前最高价/起拍价，且差值必须是加价幅度的正整数倍。响应中的 `incrementCount` 为本次报价金额相对当前最高价/起拍价的加价次数。

### 后台拍品与审核

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/admin/lots` | 后台拍品列表 |
| `POST` | `/api/admin/lots` | 新建拍品 |
| `PUT` | `/api/admin/lots/{id}` | 编辑拍品 |
| `POST` | `/api/admin/lots/{id}/submit-review` | 提交发布复核 |
| `POST` | `/api/admin/lots/{id}/advance-to-bidding` | 推进到竞拍中 |
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
| `POST` | `/api/admin/contracts/{id}/mark-signed` | 标记已签约，可选绑定合同附件 |
| `POST` | `/api/admin/contracts/{id}/mark-completed` | 标记已完成 |
| `POST` | `/api/admin/contracts/{id}/mark-defaulted` | 标记违约 |
| `GET` | `/api/admin/refunds` | 退款状态列表 |
| `POST` | `/api/admin/refunds/{id}/mark-reviewing` | 标记审核中 |
| `POST` | `/api/admin/refunds/{id}/mark-refunded` | 标记已退款 |
| `POST` | `/api/admin/auction-closing/run` | 手动触发竞拍结束处理 |

交易类后台列表字段口径：`GET /api/admin/bids`、`GET /api/admin/results`、`GET /api/admin/contracts`、`GET /api/admin/refunds` 返回行均保留原始 `lotId`，前端跳转拍品详情优先使用该字段。`GET /api/account/bids` 返回行同时包含 `lotStatus` 与 `lotStatusCode`，企业端用于区分竞拍中、成交公示、待签约、已签约、已完成、违约等后续状态，不再仅按“当前最高价”展示。

T46B 成交后线下履约口径：系统不做线上金钱交易，不新增真实支付或第三方支付接口。前端企业端 `/account/winning-detail`、后台合同详情抽屉与 `/admin/lots/progress` 复用现有成交/合同/拍品状态生成办理展示：`待签约` 表示需线下签约，`已签约` 表示待管理员核验线下尾款，`已完成` 表示管理员已确认线下尾款支付凭证并完成合同。后台“确认尾款已线下支付并完成”继续调用 `POST /api/admin/contracts/{id}/mark-completed`，前端必须二次确认“系统不处理线上资金，仅记录管理员已核验线下尾款支付凭证，请确认是否继续？”。

合同签约附件口径：管理员在标记已签约前可通过 `POST /api/files/upload` 上传一张或多张图片/PDF，合同附件暂存使用 `category=OTHER`，随后调用 `POST /api/admin/contracts/{id}/mark-signed` 时可传入：

```json
{
  "attachmentIds": ["uuid-1", "uuid-2"]
}
```

`attachmentIds` 可省略或为空；未上传附件不得阻塞签约流程。后端会将这些附件绑定到合同，并同步设置附件的 `contractId`、`lotId`、`enterpriseId` 与敏感访问属性。`GET /api/admin/contracts` 与 `GET /api/account/contracts` 的合同响应均包含：

```json
{
  "attachments": [
    {
      "id": "uuid",
      "fileName": "合同扫描件.pdf",
      "fileUrl": "/api/files/content/uuid",
      "mimeType": "application/pdf",
      "fileSize": 1024,
      "isSensitive": true,
      "createdAt": "2026-05-23T00:00:00.000Z"
    }
  ]
}
```

合同附件访问继续复用 `GET /api/files/content/{id}` / `GET /api/files/{id}` 权限控制：管理员可查看，对应中标企业可查看，其他无关企业返回 `FILE_FORBIDDEN`。

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
| `GET` | `/api/account/contracts` | 我的成交合同与合同附件 |
| `GET` | `/api/account/messages` | 我的通知 |
| `POST` | `/api/account/messages/{id}/read` | 标记已读 |
| `POST` | `/api/files/upload` | 上传拍品图片/检测报告 |
| `GET` | `/api/files/content/{id}` | 读取上传文件内容 |
| `GET` | `/api/files/{id}` | 附件权限访问 |
| `GET` | `/api/admin/files` | 文件管理 |
| `GET` | `/api/admin/logs` | 操作日志 |
| `GET` | `/api/admin/blacklist` | 黑名单列表 |
| `POST` | `/api/admin/blacklist` | 手动拉黑 |
| `POST` | `/api/admin/blacklist/{id}/release` | 解除拉黑 |

企业端与通知/黑名单列表字段口径：`GET /api/account/deposit-vouchers`、`GET /api/account/bids`、`GET /api/account/contracts`、`GET /api/account/messages`、`GET /api/admin/notifications`、`GET /api/admin/blacklist` 返回行保留原始 `lotId`；无关联拍品的通知或黑名单记录可返回 `null`。`GET /api/account/contracts` 只返回当前登录企业自己的合同与合同附件。

`GET /api/account/deposit-vouchers` 返回当前企业意向金凭证列表，行字段包含 `id`、`lotId`、`lotTitle`、`enterpriseId`、`attachmentId`、`voucherFileName`、`voucherFileUrl`、`requiredAmount`、`paidAmount`、`status`、`statusCode`、`submittedAt`、`reviewedAt`、`reviewerId`、`rejectReason`。`voucherFileUrl` 取自既有附件记录，通常为 `/api/files/content/{attachmentId}`，访问时继续走文件模块权限控制。

文件上传口径：管理员正式入口为 Bearer JWT；仅在上述开发头模式显式开启时，开发期管理员可带 `x-user-id`、`x-user-role: ADMIN` 调用 `POST /api/files/upload`。请求为 `multipart/form-data`，文件字段名固定为 `file`，表单字段 `category` 当前支持 `LOT_IMAGE`、`INSPECTION_REPORT` 与 `OTHER` 等既有附件类型；合同签约附件使用 `OTHER` 并在签约接口中绑定到合同。可选 `lotId`、`enterpriseId`。图片支持 `image/jpeg`、`image/png`，PDF 支持 `application/pdf`，单文件上限 10MB。响应示例：

```json
{
  "id": "uuid",
  "fileName": "report.pdf",
  "fileUrl": "/api/files/content/uuid",
  "mimeType": "application/pdf",
  "fileSize": 1024,
  "category": "INSPECTION_REPORT",
  "isSensitive": true
}
```

`fileUrl` 可直接回填拍品字段：`LOT_IMAGE` 用于 `imageOneUrl`/`imageTwoUrl`，`INSPECTION_REPORT` 用于 `inspectionReportUrl`。`GET /api/files/{id}` 保持原有权限元数据访问语义；`GET /api/files/content/{id}` 在通过同一附件权限校验后返回文件内容。上传文件保存到后端本地 `backend/tmp/uploads/`，该目录命中既有 `tmp/` 忽略规则，不提交 Git。

## 数据字段基线

- 拍品必填：图一、图二、拍品标题、单价/起拍价、数量、供应商、产地、截止日期、发货方式、商品信息/商品详情、检测报告、电子邮箱。
- 拍品预留：联系电话。
- 拍品竞价配置：评估价、保证金比例、保证金金额、加价幅度、公示开始/结束时间、竞拍开始/结束时间、客户须知、是否启用延时竞价、延时竞价规则说明。
- 企业认证字段以 PRD 6.2 为准。
- 出价记录字段以 PRD 6.3 为准。
- 通知字段以 PRD 6.4 为准。

## 待确认

- `意向金` 与 `保证金` 是否在数据库/API 命名中统一为 `deposit`。
- `待签约`、`已签约`、`已完成`、`违约` 暂按 Prisma `LotStatus` 与 `ContractStatus` 均保留；后续由成交合同退款模块负责一致性流转。
- 成交结果状态采用 `已生成`、`已公示`，对应 Prisma `AuctionResultStatus.GENERATED/PUBLISHED`。
- 内容状态采用 `草稿`、`已发布`、`已下架`，对应 Prisma `ContentStatus.DRAFT/PUBLISHED/UNPUBLISHED`。
- 竞价模块必须复用 `DepositsService.hasBiddingQualification(enterpriseId, lotId)` 判断资格，不得重复实现一套意向金资格规则。
