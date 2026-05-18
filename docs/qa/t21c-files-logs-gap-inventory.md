# T21C 文件管理与操作日志缺口盘点

盘点时间：2026-05-17 22:45

## 盘点范围

- 后端实现核对：`backend/src/files/**`、`backend/src/logging/**`，并用 `rg` 覆盖 `backend/src frontend/src docs` 中的目标关键词。
- 前端 mock 使用核对：`frontend/src/pages/AdminPages.tsx`、`frontend/src/services/api.ts`、`frontend/src/data/mock.ts`。
- 本次不改业务代码、不改前端页面、不改 Prisma schema、不实现新接口。

## 结论

| 项目 | 状态 | 证据 |
|---|---|---|
| `GET /api/admin/files` 后端实现 | 未实现 | 契约中已登记该接口，但 `backend/src/files/files.controller.ts` 只有 `@Controller('files')` + `@Get(':id')`，对应 `GET /api/files/{id}`；`rg` 未发现 `admin/files` 后端 controller。 |
| `GET /api/admin/logs` 后端实现 | 未实现 | 契约中已登记该接口，但 `backend/src/logging` 只有 `LoggingModule`、`OperationLogService`、`OperationLogEntry` 类型；未发现 logs controller 或 `admin/logs` 后端路由。 |
| `OperationLogService` 当前能力 | 已实现部分能力 | `OperationLogService.record()` 会补 `createdAt` 并写 Nest logger；本次未验证其是否持久化到数据库，不能视为 `GET /api/admin/logs` 已完成。 |
| 文件权限访问 `GET /api/files/{id}` | 已实现 | `FilesController.getFile()` 调用 `FilePolicyService.getAccessibleFile()`，用于单个附件权限访问；它不是后台文件管理列表。 |
| 前端文件管理页真实接口接入 | 未实现 | `FileManagementPage` 只配置 `fallbackRows: api.getFiles()`，没有 `loadRows`；`api.getFiles()` 返回 `frontend/src/data/mock.ts` 的 `files`。 |
| 前端操作日志页真实接口接入 | 未实现 | `OperationLogPage` 只配置 `fallbackRows: api.getLogs()`，没有 `loadRows`；`api.getLogs()` 返回 `frontend/src/data/mock.ts` 的 `logs`。 |
| 后台首页最近操作日志 | 未实现真实接入 | `AdminDashboardPage` 的最近操作日志表格直接使用 `api.getLogs()` mock 数据。 |

## 待确认

- `GET /api/admin/files` 的列表字段是否直接以 `Attachment` 为基线，还是需要聚合拍品、企业认证、意向金等来源业务显示名。
- `GET /api/admin/logs` 是否必须基于数据库中的 `OperationLog` 持久化记录；当前 `OperationLogService` 仅从 `backend/src/logging/**` 可见 logger 写入能力。
- 文件预览/下载是否复用现有 `GET /api/files/{id}` 权限访问结果，还是后台列表需要直接返回可访问 URL。

## 下一步最小实现建议

1. 后端先补 `GET /api/admin/files` 只读列表：管理员鉴权，读取 `Attachment`，支持最小分页；字段先覆盖前端现有列 `name/type/source/uploader/uploadedAt/ref`，不增加上传、删除、下载写能力。
2. 操作日志先确认持久化口径：若已有 Prisma `OperationLog` 表，则让 `OperationLogService.record()` 写库并补 `GET /api/admin/logs` 只读列表；若没有持久化表，先不要把 logger 输出包装成验收完成。
3. 前端在后端只读接口完成后再做最小接入：为文件管理页、操作日志页分别增加 `loadRows`，失败时沿用现有 mock fallback 和验收模式显性失败策略。

## 验证命令

```powershell
Set-Location E:/kuangchan; rg -n "admin/files|admin/logs|OperationLog|Attachment" backend/src frontend/src docs
```
