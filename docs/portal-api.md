# 门户数据看板 API

接口统一挂载在全局前缀 `/api` 下。

## 数据看板

### `GET /api/portal/dashboard`

公开首页数据看板接口，不要求登录。

Response:

```json
{
  "currentYearCompletedCount": 1,
  "currentYearCompletedAmount": "1500.25",
  "totalCompletedCount": 2,
  "totalCompletedAmount": "3501"
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `currentYearCompletedCount` | `number` | 本年已完成合同数量 |
| `currentYearCompletedAmount` | `string` | 本年已完成合同成交额 |
| `totalCompletedCount` | `number` | 累计已完成合同数量 |
| `totalCompletedAmount` | `string` | 累计已完成合同成交额 |

## 统计口径

- 只统计 `Contract.status = COMPLETED` 的合同。
- 本年统计基于 `Contract.completedAt` 位于当前自然年范围内。
- 成交额来自合同关联的 `AuctionResult.finalPrice`。
- `PENDING_SIGN`、`SIGNED`、`DEFAULTED` 合同不计入成交量和成交额。
- 已竞拍结束但合同未完成的拍品不计入成交量和成交额。
- 金额字段以字符串返回，避免 Decimal 精度丢失。

## 测试方式

```powershell
Set-Location E:/kuangchan
git status --short

Set-Location E:/kuangchan/backend
npm run lint
npm run typecheck
npm test -- portal
npm test
```
