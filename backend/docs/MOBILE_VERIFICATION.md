## Mobile Verification

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/verification/mobile/status` | JWT |
| POST | `/api/v1/verification/mobile/send-otp` | JWT |
| POST | `/api/v1/verification/mobile/verify-otp` | JWT |

### Rules

- OTP is a random 6-digit code, hashed (SHA-256) before storage
- OTP expires in **5 minutes**
- Maximum **3** resends per active OTP session
- Maximum **5** verification attempts
- Resend cooldown: **30 seconds**
- Rate limit: 5 OTP requests / minute / IP
- On success: `users.isMobileVerified = true`, `customer_verifications.mobileVerified = true`, OTP marked used

### Swagger

- UI: `http://localhost:4000/api-docs`
- Spec: `http://localhost:4000/api-docs.json`

### Postman

Import `docs/LoanEx-Mobile-Verification.postman_collection.json`

### Sample send-otp response

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "mobile": "9876543210",
    "mobileVerified": false,
    "otpSent": true,
    "expiresAt": "2026-07-29T17:10:00.000Z",
    "resendCount": 0,
    "maxResend": 3,
    "cooldownMs": 30000,
    "devOtp": "482193"
  }
}
```

### Sample verify-otp success

```json
{
  "success": true,
  "message": "Mobile number verified successfully",
  "data": {
    "mobileVerified": true,
    "mobile": "9876543210",
    "nextStep": "AADHAAR_VERIFICATION",
    "user": {
      "mobile": "9876543210",
      "isMobileVerified": true
    }
  }
}
```

### Error examples

**Invalid OTP**

```json
{
  "success": false,
  "message": "Invalid OTP. 4 attempts remaining.",
  "code": "BAD_REQUEST"
}
```

**Expired OTP**

```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP.",
  "code": "BAD_REQUEST"
}
```

**Too many resends**

```json
{
  "success": false,
  "message": "Maximum resend attempts (3) exceeded. Please try again later.",
  "code": "TOO_MANY_REQUESTS"
}
```

**Unauthorized**

```json
{
  "success": false,
  "message": "Access token is required",
  "code": "UNAUTHORIZED"
}
```
