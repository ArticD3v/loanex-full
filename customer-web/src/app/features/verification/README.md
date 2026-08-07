# Feature / Verification

Identity verification (KYC) for EMI eligibility.

## Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/verification` | `IdentityVerificationComponent` | Single-page Mobile → Aadhaar → PAN → Bank stepper |
| `/verification/summary` | `VerificationSummaryComponent` | Submit EMI application after KYC |
| `/mobile-verification`, `/aadhaar-verification`, `/pan-verification`, `/bank-verification`, `/verification/pan`, `/verification/bank` | redirects | All redirect to `/verification` |

## APIs

Uses existing `VerificationService` endpoints under `/api/v1/verification` (status, mobile, aadhaar, pan, bank). No backend changes.
