## Aadhaar Verification

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/verification/aadhaar/status` | JWT |
| POST | `/api/v1/verification/aadhaar/send-otp` | JWT |
| POST | `/api/v1/verification/aadhaar/verify` | JWT |

### Security

- Plain Aadhaar is **never** stored or returned
- Stored: `aadhaarNumberMasked` (`XXXX XXXX 1234`) + `aadhaarHash` (SHA-256)
- OTP hashed before storage
- Requires completed mobile verification
- JWT required on all endpoints

### Rules

- OTP expiry: **5 minutes**
- UI resend countdown: **60 seconds**
- Max resends: **3**
- Max verify attempts: **5**

### Services

- `VerificationService` — orchestration
- `OtpService` — generate / hash / expiry
- `AuditLogService` — audit trail in `audit_logs`

### Docs

- Swagger: `http://localhost:4000/api-docs`
- Postman: `docs/LoanEx-Aadhaar-Verification.postman_collection.json`
