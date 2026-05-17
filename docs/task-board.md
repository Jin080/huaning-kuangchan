# Task Board

状态只使用：TODO、IN_PROGRESS、BLOCKED、DONE、NEEDS_REVIEW。

## 总表

| ID | 状态 | 模块 | 任务 | 依赖 | 负责人/会话 | 备注 |
|---|---|---|---|---|---|---|
| T00 | DONE | 总控 | 建立总控协作文档 | 无 | 总控会话 | 已建立 5 个固定协作文档 |
| T01 | DONE | 环境 | 连接本地目录与远程 Git 仓库 | 人工确认 | 总控会话 | `git status --short` 可用；origin 指向 `https://github.com/Jin080/huaning-kuangchan.git` |
| T02 | DONE | 前端基础 | 修复 App.tsx Fast Refresh lint 问题 | 总控授权 | 总控会话 | `frontend npm run lint` 与 `npm run build` 已通过 |
| T03 | DONE | 后端基础 | 初始化后端工程、统一响应、认证、文件上传、日志 | 无 | 后端基础架构会话 | lint/typecheck/test/health 已通过 |
| T04 | DONE | 数据模型 | Prisma schema 与状态枚举 | T03 | 数据模型与 Prisma 会话 | PostgreSQL `127.0.0.1:55432` 上 `prisma migrate dev --name init` 已通过 |
| T05 | TODO | 拍品后台 | 拍品创建/复核/公示 API 与页面接入 | T03,T04 | 可启动 | 需遵守不改 schema |
| T06 | TODO | 企业认证 | 企业入驻、认证审核、驳回重提 | T03,T04 | 可启动 | 意向金可先做接口，资格联动等拍品 |
| T07 | BLOCKED | 意向金资格 | 凭证上传、审核、资格 | T05,T06 | 暂缓 | 依赖拍品和企业 |
| T08 | BLOCKED | 竞价核心 | 报价校验、最高价、结束中标 | T04,T05,T06,T07 | 暂缓 | 明确禁止提前启动 |
| T09 | BLOCKED | 成交合同退款黑名单 | 成交公示、合同、退款、黑名单 | T08 | 暂缓 | 依赖竞价结果 |
| T10 | BLOCKED | 个人中心消息 | 我的认证/意向金/出价/通知 | T06,T07,T08,T09 | 暂缓 | 依赖各业务域 |
| T11 | TODO | 内容管理 | 资讯与公开说明 | T03,T04 | 可启动 | 需遵守不改 schema |
| T12 | BLOCKED | 前台门户接入 | 首页、公告、竞价、成交、资讯真实 API | T03,T04,T05,T07,T08,T09,T11 | 暂缓 | 等 API 可用 |
| T13 | NEEDS_REVIEW | 测试验收 | 主流程 E2E 用例与权限用例 | T03,T04 | 测试验收与联调会话 | 矩阵与复测记录已完成；真实 E2E 等业务 API |
| T14 | BLOCKED | 集成发布 | `api.ts` 真实 API 适配与联调 | T03-T12 | 暂缓 | 最后统一接入 |

## 当前可并行任务

- T05 拍品后台：可立即启动。
- T06 企业认证与意向金：可立即启动；意向金与拍品联动点需和 T05 对齐。
- T11 内容管理：可立即启动。

## 当前必须串行任务

- T07 意向金资格必须等 T05 拍品与 T06 企业认证。
- T08 竞价核心必须等 T04/T05/T06/T07。
- T14 集成发布必须等主要 API 可用。
