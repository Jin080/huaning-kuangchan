# T32B 前端拍品表单真实上传验证记录

- 验证时间：2026-05-18 17:45
- 验证页面：`http://127.0.0.1:5173/admin/lots/edit`
- 前端服务：`VITE_API_BASE_URL=http://127.0.0.1:3100/api`、`VITE_ACCEPTANCE_MODE=true`
- 后端服务：`http://127.0.0.1:3100/api/health` 返回 200

## 上传交互证据

Playwright 会话 `t32b-final2` 验证三个上传入口均为真实 `input[type=file]`，并通过 `setInputFiles` 模拟本机文件选择：

| 入口 | 字段 | 上传类别 | 响应状态 | 回填结果 |
|---|---|---|---|---|
| 拍品图一 | `imageOneUrl` | `LOT_IMAGE` | 201 | `http://127.0.0.1:3100/api/files/content/3ba4d993-0690-4241-bb2b-a3b1963ecdc8` |
| 拍品图二 | `imageTwoUrl` | `LOT_IMAGE` | 201 | `http://127.0.0.1:3100/api/files/content/3dcb1a85-a78e-4cee-9f3c-8b5524592442` |
| 检测报告 | `inspectionReportUrl` | `INSPECTION_REPORT` | 201 | `http://127.0.0.1:3100/api/files/content/22d0ab08-0451-466b-be91-c5b5a0081fa4` |

Playwright network requests 显示三次 `POST http://127.0.0.1:3100/api/files/upload => 201 Created`。

## 保存流程验证

- 保存草稿：`POST http://127.0.0.1:3100/api/admin/lots` 返回 201，生成拍品 ID `c1879838-5ca6-44fd-9b54-6e7726e0ea7e`。
- 保存并提交复核：`POST http://127.0.0.1:3100/api/admin/lots` 返回 201，生成拍品 ID `13cf78df-9c15-49d2-94de-374d24ebe66d`；随后 `POST /api/admin/lots/13cf78df-9c15-49d2-94de-374d24ebe66d/submit-review` 返回 201。
- 页面提示：`拍品已保存并提交发布复核。`

## 页面验证

- `npx --yes --package @playwright/cli playwright-cli -s=t32b-final2 console error`：0 errors。
- 390px 宽度检查：`innerWidth=390`、`scrollWidth=390`、`bodyScrollWidth=390`、`overflow=false`。
- 截图产物：`docs/qa/t32b-admin-lot-upload-mobile.png`。
