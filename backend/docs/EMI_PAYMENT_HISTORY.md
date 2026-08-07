# EMI Payment History & Loan Statement

## Customer APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/emi/payment-history` | Filters: `status`, `paymentType`, `dateFrom`, `dateTo`, `search` |
| GET | `/api/v1/emi/payment-history/:paymentId` | Single payment |
| GET | `/api/v1/emi/payment-history/:paymentId/receipt` | PDF receipt |
| GET | `/api/v1/emi/payment-history/export?format=pdf\|excel` | Export |
| GET | `/api/v1/emi/statement` | Statement JSON |
| GET | `/api/v1/emi/statement/pdf` | Statement PDF |

## Frontend

- `/my-emi/payment-history` → `PaymentHistoryComponent`
- `/my-emi/statement` → `LoanStatementComponent`

## Audits

- `PAYMENT_HISTORY_VIEWED`
- `STATEMENT_DOWNLOADED`
- `RECEIPT_DOWNLOADED`
