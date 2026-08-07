# AutoPay Management

Abstract AutoPay architecture (stub provider now; Razorpay/UPI/eMandate/NACH pluggable later).

## Customer APIs

| Method | Path |
|--------|------|
| GET | `/api/v1/autopay/status` |
| POST | `/api/v1/autopay/create-mandate` |
| POST | `/api/v1/autopay/cancel-mandate` |
| GET | `/api/v1/autopay/history` |

## Admin APIs

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/autopay` |
| GET | `/api/v1/admin/autopay/:loanId` |
| PATCH | `/api/v1/admin/autopay/:loanId` |

Admin PATCH body: `{ "status": "ACTIVE" | "PAUSED" | "CANCELLED" | ... }`

Approve pending mandates with `status: "ACTIVE"`.

## Provider switch

`AUTOPAY_PROVIDER=STUB` (default) or `RAZORPAY` (placeholder until integrated).

Interface: `backend/src/modules/autopay/providers/autopay-provider.ts`

## Frontend

Route: `/my-emi/autopay` → `AutopayComponent`

## Audits / notifications

- Audits: `MANDATE_CREATED`, `MANDATE_CANCELLED`, `MANDATE_APPROVED`
- Notifications: `AUTO_PAY_ENABLED`, `AUTO_PAY_DISABLED`, `AUTO_PAY_FAILED`, `AUTO_PAY_SUCCESS`
