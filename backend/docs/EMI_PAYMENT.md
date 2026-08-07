# EMI Payment

Razorpay EMI instalment payments for active loans.

## Customer APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/emi/payments/:emiId` | JWT |
| POST | `/api/v1/emi/payments/create-order` | JWT |
| POST | `/api/v1/emi/payments/verify` | JWT |
| POST | `/api/v1/emi/payments/dev-bypass-signature` | JWT (dev only) |
| GET | `/api/v1/emi/payments/:emiId/receipt` | JWT — PDF |

## Admin

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/emi-payments?loanId=` |

## Rules

- Only current unpaid EMI (or overdue) can be paid
- Already paid / duplicate SUCCESS → `409`
- Invalid signature → `400` + `EMI_PAYMENT_FAILED`
- On success: schedule `PAID`, loan outstanding/paid/next due/last payment updated

## Frontend

- Route: `/my-emi/pay/:emiId`
- Component: `EmiPaymentComponent`
- After success → `/my-emi` (dashboard refresh)

## Audits

- `EMI_PAYMENT_INITIATED`
- `EMI_PAYMENT_SUCCESS`
- `EMI_PAYMENT_FAILED`
