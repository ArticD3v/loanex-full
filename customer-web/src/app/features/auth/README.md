# Feature / Auth

Authentication screens and flows for LoanEx.

## Routes

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/reset-password`

## Integration

Uses real REST APIs from `LoanEx` backend (`/api/v1/auth/*`) via:

- `AuthService`
- `TokenService`
- `authGuard` / `guestGuard`
- `authInterceptor`
