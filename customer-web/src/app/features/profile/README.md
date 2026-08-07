# Feature / Profile

Customer profile and account settings.

## Routes

| Path | Page |
|------|------|
| `/profile` | My Profile — edit personal info and addresses |
| `/profile/settings` | Settings — account summary and quick links |

Both routes require `authGuard`.

## API

Uses existing `ProfileService` → `/api/v1/profile`.
