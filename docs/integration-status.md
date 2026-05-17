# Integration Status

Last updated: 2026-05-17

## Read Scope

Required files read:

- `docs/huaning-mineral-auction-pc-prd.md`
- `docs/frontend-backend-integration-checklist.md`
- `docs/huaning-mineral-auction-multi-agent-dev-plan.md`
- `frontend/package.json`
- `frontend/src/services/api.ts`

Optional files checked:

- `backend/package.json`: missing
- `backend/prisma/schema.prisma`: missing

Additional files read for frontend mock comparison:

- `frontend/src/data/mock.ts`
- `frontend/src/types.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/PortalPages.tsx`
- `frontend/src/pages/AdminPages.tsx`
- `frontend/src/pages/AccountPages.tsx`

## Repository And Environment Notes

- `Set-Location E:/kuangchan; git status --short` failed because `E:/kuangchan` is not currently recognized as a Git repository.
- Frontend stack is React + TypeScript + Vite.
- Frontend data is currently served by `frontend/src/services/api.ts`, which directly returns mock data from `frontend/src/data/mock.ts`.
- Backend package and Prisma schema are not present yet, so backend lint/typecheck/test commands are not runnable at this stage.

## Assumptions

- PRD is the source of truth when mock pages or mock data conflict with requirements.
- Existing frontend pages are a static mock shell. Integration should first replace `api.ts`/adapter behavior and avoid page-wide rewrites.
- Backend sessions should provide unified auth, response format, file upload, logging, and permission checks.
- Data model session should decide final database enum constants, but labels must map one-to-one with PRD Chinese statuses.
- Dashboard statistics count only contract status `已完成`, using contract completion time and final transaction amount.

## Ambiguities To Resolve

- PRD uses "意向金" in flow naming and "保证金" in payment/status copy. Interface naming should be confirmed as either one canonical term or a documented alias.
- PRD lists `待签约`/`已签约`/`已完成`/`违约` under both lot lifecycle and contract status concepts. Data model should confirm whether these are duplicated lot states or derived from contract status.
- Result status is not defined in PRD, while frontend mock uses `已生成` and `已公示`.
- Content management status is not defined in PRD, while frontend mock uses `草稿`/`已发布`/`已下架`.
- SMS provider is unspecified. Backend should expose send-record persistence and a replaceable SMS provider boundary.
- Platform customer service phone is reserved empty in PRD. Blacklist/login error copy should not hardcode a phone number.

## PRD vs Frontend Mock Conflicts

| Area | PRD Requirement | Current frontend/mock | Integration decision |
|---|---|---|---|
| Dashboard counting | Only completed contracts count toward成交量/成交额 | Mock `stats` are fixed strings; one helper says month-over-month growth | Backend `/api/portal/dashboard` must compute by `合同状态=已完成`; frontend helper copy can be display-only |
| Auction timing | 公示期结束后才进入竞拍期 | Mock lot `HN-2026-0517-01` has publicity `2026-05-18 至 2026-05-24` but status `竞拍中` on 2026-05-17 | Mock data is inconsistent; backend state must be time/status valid |
| Winner notification | 成交通知 generated after auction ends | Mock notification references a lot still shown as `竞拍中` | Backend must generate notifications only after auction close/result generation |
| Current highest bidder privacy | Public pages do not show highest enterprise name; all bid records desensitized, my records show real enterprise | Auction detail shows only masked enterprise, but account bid list uses shared mock records for all enterprises | Account APIs must be scoped to current enterprise; public bid record API must always mask names |
| Resource cards | 首页矿产资源小卡片可点击进入详情 | Home currently shows upcoming/live/result sections but no distinct mineral resource card section | Frontend session should add or map resource cards before final acceptance |
| Detail images | PRD requires image carousel and image one/two fields | Frontend `DetailHero` uses a placeholder block and category text | Backend should still return image fields; frontend visual mock needs later UI completion |
| Required lot fields | PRD requires deadline, delivery method, description, inspection report, email | Mock `Lot` lacks these required fields | Backend contract must include them; adapter can format detail displays |
| Refund flow | No refund voucher upload required | Frontend file management only includes payment voucher; refund page has state only | Current mock aligns; backend must not require refund voucher |
| Blacklisted user prompt | Prompt contact platform service; service phone reserved empty | Login page has generic copy and no phone | Keep phone empty/configurable |

## Cross-Module Conflict Watchlist

- File conflict risk: `frontend/src/services/api.ts` is the shared integration point and should be owned by integration/frontend adapter work only.
- File conflict risk: route registration in `frontend/src/App.tsx` is stable and should only change for missing PRD routes.
- Interface conflict risk: list responses must use `items,total,page,pageSize`, while current frontend expects arrays directly.
- Field conflict risk: frontend uses `startPrice`, `currentPrice`, `deposit`, `auctionTime` as formatted strings; backend should return numeric/time primitives plus optional display fields or an adapter must convert them.
- Status conflict risk: frontend mock includes result/content/send statuses outside the PRD enum list. These need backend/data-model confirmation.
- Permission conflict risk: `/api/lots/{id}/bid-records` and `/api/account/bids` must not share the same unscoped response.
- Dashboard conflict risk: Agent 8 contract completion drives dashboard counting; Agent 3/portal must not count published results alone.

## Dependency Status

| Dependency | Needed from | Current status |
|---|---|---|
| Unified response, auth, file upload, logs | Agent 1 backend infrastructure | Not present in workspace |
| Prisma schema and enums | Agent 2 data model | Not present in workspace |
| Lot management APIs | Agent 4 | Contract draft only |
| Enterprise certification APIs | Agent 5 | Contract draft only |
| Deposit/qualification APIs | Agent 6 | Contract draft only |
| Bid engine and result generation | Agent 7 | Contract draft only |
| Contract/refund/blacklist APIs | Agent 8 | Contract draft only |
| Account messages and scoped account APIs | Agent 9 | Contract draft only |
| Content/public disclosure APIs | Agent 10 | Contract draft only |

## Acceptance Flow To Organize

1. 拍品发布: create lot draft -> submit review -> approve -> lot appears as `公示中`.
2. 企业认证: enterprise register -> admin approve -> enterprise status `审核通过`.
3. 意向金审核: upload voucher during publicity -> admin approve -> deposit status `审核通过`.
4. 竞价: lot enters `竞拍中` -> qualified enterprise bids -> invalid/late/under-increment bids rejected.
5. 成交: auction closes -> highest bid wins -> result generated -> winner and loser notifications created.
6. 合同完成: admin marks contract `已签约` then `已完成`.
7. 数据看板: completed contract amount/count appears in dashboard statistics.

## Verification Status

- `Set-Location E:/kuangchan; git status --short`: failed, not a Git repository.
- `Set-Location E:/kuangchan/frontend; npm run lint`: not run yet in this pass.
- `Set-Location E:/kuangchan/frontend; npm run build`: not run yet in this pass.
- Backend lint/typecheck/test: not applicable until backend exists.
