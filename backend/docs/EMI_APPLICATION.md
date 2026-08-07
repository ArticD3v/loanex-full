## EMI Application Submission

### Customer APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/emi/applications/review` | JWT |
| POST | `/api/v1/emi/applications` | JWT |
| GET | `/api/v1/emi/applications/status` | JWT |
| GET | `/api/v1/emi/applications/current?event=viewed\|refreshed` | JWT |

See also `PENDING_REVIEW.md` for pending-screen polling, audit events (`STATUS_VIEWED` / `STATUS_REFRESHED`), and status routing.

### Admin API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/admin/emi-applications?status=PENDING` | JWT |

### Rules

- Requires all verifications complete (`overallStatus = COMPLETED`)
- One active application per customer
- Default status: `PENDING`
- Sets `customer_verifications.verificationStatus = PENDING_REVIEW`
- Audit: `APPLICATION_SUBMITTED`

### Frontend

- Summary: `/verification/summary`
- Pending review: `/emi/pending-review`
