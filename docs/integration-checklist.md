# Integration Checklist

用于记录集成验收清单和端到端流程。PRD 主流程必须先于页面美化验收。

## 阶段门槛

### Phase 0: 总控与契约

- [x] 建立总控文档。
- [x] 汇总接口路径、状态枚举、字段基线。
- [x] 确认 Git 仓库状态。
- [x] 修复或登记前端 lint 既有问题。

### Phase 1: 后端基础与数据模型

- [x] 后端工程可安装、可 lint、可 typecheck、可 test。
- [x] 统一响应格式落地。
- [x] 认证/角色/权限基础落地。
- [x] 文件上传基础落地。
- [x] 操作日志基础落地。
- [x] Prisma schema 覆盖 PRD 核心实体和状态枚举。

### Phase 2: 基础业务

- [ ] 拍品创建、编辑、提交复核、审核通过、驳回。
- [ ] 企业入驻、认证审核、驳回重提。
- [ ] 意向金凭证上传、审核通过、审核驳回。
- [ ] 内容资讯和公开说明页。

### Phase 3: 交易闭环

- [ ] 竞价资格校验。
- [ ] 报价规则校验。
- [ ] 当前最高价刷新。
- [ ] 竞拍结束自动确认中标。
- [ ] 成交通知和失败通知。
- [ ] 成交公示、合同状态、退款状态、黑名单。

### Phase 4: 前端接入与验收

- [ ] `frontend/src/services/api.ts` 接入真实 API 或适配层。
- [ ] 首页、公告、竞价、成交、资讯可访问。
- [ ] 后台管理核心页面可调用真实 API。
- [ ] 个人中心只显示本企业数据。
- [ ] 数据看板只统计合同 `已完成` 拍品。

## 端到端主流程

1. 管理员创建拍品草稿。
   - 验收：状态 `草稿`，必填字段完整。
2. 管理员提交发布复核。
   - 验收：状态 `待发布复核`，操作日志记录。
3. 复核通过。
   - 验收：状态 `公示中`，前台即将拍卖公告可见。
4. 企业提交认证。
   - 验收：状态 `待审核`。
5. 管理员审核企业通过。
   - 验收：状态 `审核通过`。
6. 企业上传意向金付款凭证。
   - 验收：状态 `待审核`，附件有权限控制。
7. 管理员审核意向金通过。
   - 验收：状态 `审核通过`，企业获得该拍品竞价资格。
8. 拍品进入竞拍期。
   - 验收：状态 `竞拍中`，正在竞价标的可见。
9. 有资格企业报价。
   - 验收：符合加价幅度才成功；无资格、低价、过期报价被拒绝。
10. 竞拍结束。
    - 验收：最高价企业中标，生成成交结果。
11. 通知生成。
    - 验收：中标企业收到成交通知，未中标企业收到失败通知。
12. 成交公示发布。
    - 验收：公开展示中标企业名称、最终成交价、成交拍品。
13. 合同状态完成。
    - 验收：合同 `已完成` 后成交额计入数据看板。
14. 退款状态登记。
    - 验收：未中标企业可登记 `未退款`、`审核中`、`已退款`，不要求退款凭证。

## 当前验证记录

- `Set-Location E:/kuangchan; git status --short`：通过，当前目录已是 Git 仓库。
- `git remote -v`：origin 指向 `https://github.com/Jin080/huaning-kuangchan.git`。
- `Set-Location E:/kuangchan/frontend; npm run lint`：通过。
- `Set-Location E:/kuangchan/frontend; npm run build`：通过。
- `Set-Location E:/kuangchan/backend; npm run lint`：通过。
- `Set-Location E:/kuangchan/backend; npm run typecheck`：通过。
- `Set-Location E:/kuangchan/backend; npm test`：通过。
- `Set-Location E:/kuangchan/backend; npx prisma migrate dev --name init`：通过，数据库为 `127.0.0.1:55432/huaning_mineral_auction`。
