## Approved Loan Offer (Customer)

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/emi/applications/current-offer` | JWT |
| POST | `/api/v1/emi/applications/accept-offer` | JWT |
| POST | `/api/v1/emi/applications/decline-offer` | JWT |

### Rules

- Only `status = APPROVED` can view/accept/decline the offer
- Accept → `OFFER_ACCEPTED` + `offerAcceptedAt` → Down Payment
- Decline → `DECLINED_BY_CUSTOMER` + `offerDeclinedAt`

### Audit

- `OFFER_VIEWED`
- `OFFER_ACCEPTED`
- `OFFER_DECLINED`

### Frontend

- Route: `/application/approved`
- After accept: `/application/down-payment`
