# EMI Dashboard & Loan Management

Customer EMI dashboard after order delivery activates the loan.

## Customer APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/loans/current` | JWT |
| GET | `/api/v1/loans/dashboard` | JWT |
| GET | `/api/v1/loans/payment-history` | JWT |
| GET | `/api/v1/loans/statement` | JWT — PDF |
| GET | `/api/v1/loans/agreement` | JWT — PDF |

Dashboard requires `loanStatus = ACTIVE`. Otherwise `403`.

## Admin APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/admin/loans` | JWT |
| GET | `/api/v1/admin/loans/:loanId` | JWT |
| PATCH | `/api/v1/admin/loans/:loanId` | JWT |

PATCH body: `{ "loanStatus": "ACTIVE" \| "PAUSED" \| "CLOSED", "remarks?": "..." }`

## Activation flow

Order `DELIVERED` → EMI application `ACTIVE_EMI` → `loan_accounts` created with full `emi_schedule` → loan `ACTIVE`.

## Database

- `loan_accounts`
- `emi_schedule` (`paymentStatus`: PENDING | PAID | OVERDUE | FAILED)

## Frontend

- Route: `/my-emi`
- Component: `EmiDashboardComponent`
- Pay EMI is deferred to the next module (button shows coming-soon message)

## Audits

- `LOAN_CREATED`
- `LOAN_ACTIVATED`
- `EMI_DASHBOARD_VIEWED`
- `LOAN_STATUS_UPDATED` (admin)

## Docs

- Swagger: `docs/openapi.json`
- Postman: `docs/LoanEx-EMI-Dashboard.postman_collection.json`
