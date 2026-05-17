# Main Flow Acceptance Checklist

This checklist verifies the PRD main path: 拍品发布 -> 企业认证 -> 意向金审核 -> 竞价 -> 成交 -> 合同完成 -> 数据看板计入.

## Preconditions

- Admin account exists and can access backend management APIs.
- Enterprise account exists or can register.
- File upload supports lot images, inspection reports, business license, and deposit voucher.
- Server time can be controlled or test data can be created with valid publicity and auction windows.
- Dashboard API computes from completed contracts, not merely published results.

## Test Data

- Lot title: `E2E-华宁矿产竞拍主流程`
- Start price: `100`
- Bid increment: `10`
- Deposit amount: `1000`
- Enterprise A: certified bidder and eventual winner.
- Enterprise B: certified bidder and loser.

## Steps

1. Admin creates a lot draft with all PRD-required fields.
   - Verify: lot status is `草稿`.
   - Verify: required files and inspection report are attached.

2. Admin submits lot review.
   - Verify: lot status becomes `待发布复核`.
   - Verify: operation log records submit action.

3. Admin approves lot review.
   - Verify: lot status becomes `公示中`.
   - Verify: public upcoming list returns this lot.
   - Verify: live auction list does not return this lot yet.

4. Enterprise A and B submit certification.
   - Verify: certification status is `待审核`.
   - Verify: each enterprise can only view its own certification data.

5. Admin approves Enterprise A and B.
   - Verify: certification status is `审核通过`.
   - Verify: operation log records approval.

6. Enterprise A and B upload deposit vouchers during publicity.
   - Verify: deposit status is `待审核`.
   - Verify: voucher files are not publicly accessible.

7. Admin approves both deposit vouchers.
   - Verify: deposit status is `审核通过`.
   - Verify: both enterprises gain bidding qualification for this lot only.

8. Move lot into auction window.
   - Verify: lot status is `竞拍中`.
   - Verify: live auction list returns the lot.

9. Submit bid below current price or invalid increment.
   - Verify: API returns `INVALID_BID_INCREMENT`.
   - Verify: no bid record is created.

10. Enterprise A submits a valid bid.
    - Verify: bid record created with server receive time.
    - Verify: current highest price updates.

11. Enterprise B submits a higher valid bid.
    - Verify: Enterprise B becomes current highest bidder.
    - Verify: public bid records show masked enterprise names.

12. Enterprise A submits the final highest valid bid.
    - Verify: Enterprise A becomes current highest bidder.
    - Verify: Enterprise A account bid list shows its own real bid records.

13. Move lot past auction end and run close/winner confirmation.
    - Verify: highest bid wins.
    - Verify: result is generated.
    - Verify: winner notification and loser notification are generated.

14. Admin publishes result.
    - Verify: public result list shows lot title, winner enterprise name, final price.

15. Admin marks contract `已签约`, then `已完成`.
    - Verify: contract status changes are logged.
    - Verify: before `已完成`, dashboard does not count this result.
    - Verify: after `已完成`, dashboard count and amount include this result.

16. Admin updates loser refund state.
    - Verify: refund status can move `未退款` -> `审核中` -> `已退款`.
    - Verify: no refund voucher is required.

## Negative Permission Checks

- Visitor cannot submit deposit voucher or bid.
- Uncertified enterprise cannot submit deposit voucher.
- Certified enterprise without approved deposit cannot bid.
- Blacklisted enterprise cannot log in or operate and receives contact-platform-service prompt.
- Canceled/defaulted lot is hidden from public frontend lists.
