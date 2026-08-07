## PAN Verification

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/verification/pan/status` | JWT |
| POST | `/api/v1/verification/pan/verify` | JWT |

### Security

- Plain PAN is never stored or returned
- Stored: `panNumberMasked` (`ABC******4F`) + `panHash` (SHA-256)
- Requires completed Aadhaar verification
- Audit event: `PAN_VERIFIED` (userId, timestamp, IP, device)

### Frontend

- Route: `/verification/pan`
- On success → `/bank-verification`

### Docs

- Swagger: `http://localhost:4000/api-docs`
- Postman: `docs/LoanEx-PAN-Verification.postman_collection.json`
