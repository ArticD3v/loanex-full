# Feature / Support

Customer support ticket submission and ticket history.

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/support` | `ContactSupportComponent` | `authGuard` |

## API

Uses `SupportService` (`services/support.service.ts`):

- `POST /api/v1/support` — create ticket
- `GET /api/v1/support` — list user tickets

Issue types: `ORDER_ISSUE`, `EMI_ISSUE`, `PAYMENT_ISSUE`, `ACCOUNT_ISSUE`, `OTHER`.

Optional attachment is sent as a data URL string (max ~500KB client-side check).

## Lazy loading

Registered from `app.routes.ts` via `loadChildren` → `SUPPORT_ROUTES`.
