# Release Notes

## T19 发布前人工复核归档 - 2026-05-17 22:22

### 发布范围

- T14 主流程收口：后台创建/编辑拍品、发布复核、企业入驻与审核、意向金上传与审核、推进竞拍、报价、竞拍结束成交、成交公示、合同完成、门户看板统计。
- T18 发布前补强：敏感附件权限 HTTP 访问控制、管理员竞拍结束 HTTP 触达入口、发布验收模式说明。
- 本阶段正式口径：
  - `POST /api/admin/lots/{id}/advance-to-bidding` 用于将符合窗口条件的 `公示中` 拍品推进到 `竞拍中`。
  - `POST /api/admin/auction-closing/run` 用于管理员手动触发竞拍结束处理，也可由外部运维定时调用。
  - `GET /api/files/{id}` 用于敏感附件权限访问，未授权企业返回 `FILE_FORBIDDEN`。

### 本轮验证结论

- 后端 lint、typecheck、全量测试通过：19 个测试套件、66 个用例通过。
- HTTP/DB 主流程脚本通过：`npm test -- main-flow-http-db`。
- 敏感附件权限脚本通过：`npm test -- sensitive-files-http-db`。
- 竞拍结束入口脚本通过：`npm test -- auction-closing-http-db`。
- 前端 lint 与生产构建通过。
- `git diff --check` 无空白错误，仅有 LF/CRLF warning。

### 剩余非阻塞事项

- 登录/JWT 未实现，仍使用开发请求头模拟登录态。
- 结构化延时竞价未实现。
- 后台新建/编辑内容、手动拉黑/解除拉黑、文件管理、操作日志真实接入仍待后续阶段。
- 内置定时框架未实现；当前使用管理员手动触发或外部运维定时调用竞拍结束入口。

### 发布注意事项

- 发布验收必须设置 `VITE_ACCEPTANCE_MODE=true`，真实 API 失败不得回退 mock 后判定通过。
- 提交前需确认当前脏工作区是否整体纳入提交，尤其是既有 `renzheng/*.png` 删除状态。
- 生产化认证改造后，需要重新验证敏感附件权限、企业数据隔离和主流程 HTTP/DB 验收。

## T26 全量收口复核归档 - 2026-05-18 08:36

### 本轮新增确认

- T20-T25 任务板状态和交接记录已复核，均具备 DONE 或最终通过记录。
- 后台内容新建/编辑、黑名单手动拉黑/解除拉黑、后台文件管理、操作日志页面真实接入已纳入当前阶段提交范围建议。
- `OperationLogService.record()` 已持久化写入 `operation_logs`，`GET /api/admin/logs` 可查询业务操作日志。

### 本轮验证结论

- 后端 lint、typecheck、全量测试通过：22 个测试套件、77 个用例通过。
- 关键 HTTP/DB E2E 顺序复跑通过：`main-flow-http-db`、`sensitive-files-http-db`、`auction-closing-http-db`。
- 前端 lint 与生产构建通过。
- `git diff --check` 无 whitespace error，仅有 LF/CRLF warning。

### 提交准备结论

- 可以进入提交准备，但本轮未执行 git commit。
- 建议提交范围为当前阶段业务代码、前端接入、测试、API/QA/发布文档和总控协作文档整体归档。
- 提交前仍需总控确认是否纳入 5 个 `renzheng/*.png` 删除项，以及是否接受当前 LF/CRLF warning。
