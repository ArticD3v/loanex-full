## Pending Review

### Customer APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/emi/applications/current?event=viewed\|refreshed` | JWT |
| GET | `/api/v1/emi/applications/status` | JWT |

### Response (current)

```json
{
  "applicationNumber": "LX-EMI-20260729-0001",
  "status": "PENDING",
  "submittedAt": "...",
  "approvedAmount": null,
  "approvedTenure": null,
  "approvedDownPayment": null
}
```

### Frontend

- Route: `/application/pending`
- Polls `/current` every 30 seconds
- `APPROVED` → `/application/approved`
- `REJECTED` → `/application/rejected`

### Audit

- `STATUS_VIEWED`
- `STATUS_REFRESHED`
