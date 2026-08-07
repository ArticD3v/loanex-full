# LoanEx API

Production-ready authentication API for LoanEx.

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- JWT (access + refresh)
- Zod validation
- bcrypt password hashing
- Helmet, CORS, rate limiting

## Prerequisites

PostgreSQL 14+ running locally, **or** Docker:

```bash
docker compose up -d
```

Default connection (see `.env`):

```
postgresql://postgres:postgres@localhost:5432/loanex?schema=public
```

Create the database if needed:

```sql
CREATE DATABASE loanex;
```

## Quick start

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

API base: `http://localhost:4000/api/v1/auth`

Health check: `http://localhost:4000/health`

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create account + send OTP |
| POST | `/login` | Login with email/mobile + password |
| POST | `/send-otp` | Send OTP |
| POST | `/verify-otp` | Verify OTP (activates account on register) |
| POST | `/forgot-password` | Send password-reset OTP |
| POST | `/reset-password` | Reset password with OTP |
| POST | `/refresh-token` | Rotate refresh token |
| POST | `/logout` | Revoke refresh token |

In development, OTPs are printed to the server console (`OTP_DEV_ECHO=true`) and may also be returned as `devOtp` in API responses.
