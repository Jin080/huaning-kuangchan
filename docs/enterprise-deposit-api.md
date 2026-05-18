# Enterprise Certification And Deposit API

## Scope

This document records the enterprise certification and deposit voucher API implemented by the enterprise/deposit session. It does not replace `docs/api-contract.md`.

## Auth

The current backend foundation reads identity from request headers:

- `x-user-id`: current user id.
- `x-user-role`: `ENTERPRISE` or `ADMIN`.

## Enterprise Certification

### Submit Enterprise Certification

- Method: `POST`
- Path: `/api/enterprises/register`
- Role: `ENTERPRISE`
- Result: creates or updates the current user's enterprise certification and sets status to `待审核`.

Request body fields follow PRD 6.2 and the Prisma `Enterprise` model:

- `name`
- `contactPerson`
- `contactPhone`
- `mainCategory`
- `legalRepresentative`
- `legalRepresentativeIdNo`
- `email`
- `userCategory`
- `userType`
- `registeredCapital`
- `region`
- `address`
- `unifiedSocialCreditCode`
- `companyProfile`
- `businessScope`
- `paymentBankAccount`
- `paymentAccountName`
- `paymentBankName`
- `paymentBankLineNo`
- `paymentIsBankOfChina`
- `receivingBankAccount`
- `receivingAccountName`
- `receivingBankName`
- `receivingBankLineNo`
- `receivingIsBankOfChina`
- `agreementAccepted`
- `qualificationFileUrl`
- `businessLicenseFileUrl`

### My Certification

- Method: `GET`
- Path: `/api/account/certification`
- Role: `ENTERPRISE`
- Result: returns only the current user's enterprise certification. If no enterprise is bound, returns `未提交`.

### Resubmit My Certification

- Method: `PUT`
- Path: `/api/account/certification`
- Role: `ENTERPRISE`
- Result: updates the current user's enterprise certification, clears previous reviewer/reject fields, and sets status to `待审核`.

### Admin Review

- `GET /api/admin/reviews/enterprises`
- `POST /api/admin/reviews/enterprises/{id}/approve`
- `POST /api/admin/reviews/enterprises/{id}/reject`

Reject body:

```json
{
  "rejectReason": "营业执照不清晰"
}
```

## Deposit Voucher

### Submit Voucher

- Method: `POST`
- Path: `/api/lots/{id}/deposit-vouchers`
- Role: `ENTERPRISE`
- Result: creates or updates the current enterprise's deposit voucher for the lot and sets status to `待审核`.

Request body:

```json
{
  "voucherFileName": "付款凭证.pdf",
  "voucherFileUrl": "https://files.example.com/deposit.pdf",
  "paidAmount": "50000"
}
```

Rules:

- Current enterprise certification must be `审核通过`.
- Blacklisted enterprises are rejected.
- `requiredAmount` is copied from `Lot.depositAmount`.
- One enterprise has at most one voucher record per lot; resubmission updates the existing record.

### Admin Review

- `GET /api/admin/reviews/deposits`
- `POST /api/admin/reviews/deposits/{id}/approve`
- `POST /api/admin/reviews/deposits/{id}/reject`

`GET /api/admin/reviews/deposits` response items include both stable IDs and display names:

- `enterpriseId`
- `enterpriseName`
- `lotId`
- `lotTitle`

Clients should prefer `enterpriseName` and `lotTitle` for display and keep `enterpriseId` and `lotId` as fallback-compatible identifiers.

Reject body:

```json
{
  "rejectReason": "付款凭证金额不一致"
}
```

## Bidding Qualification Service Boundary

`DepositsService.hasBiddingQualification(enterpriseId, lotId)` returns `true` only when:

- The enterprise certification status is `APPROVED`.
- The enterprise is not blacklisted.
- The deposit voucher for the target lot is `APPROVED`.

This method is the integration boundary for the bidding module. Lot lifecycle checks, bid increment checks, and auction end checks remain outside this module.

## Status Mapping

- Enterprise certification:
  - `NOT_SUBMITTED` -> `未提交`
  - `PENDING` -> `待审核`
  - `APPROVED` -> `审核通过`
  - `REJECTED` -> `审核驳回`
- Deposit voucher:
  - `NOT_SUBMITTED` -> `未提交`
  - `PENDING` -> `待审核`
  - `APPROVED` -> `审核通过`
  - `REJECTED` -> `审核驳回`

## Current Integration Notes

- The deposit API uses the existing Prisma `Lot` model but does not implement lot publishing or lot status transitions.
- Online payment is not implemented.
- Refund voucher upload is not required and not implemented.
