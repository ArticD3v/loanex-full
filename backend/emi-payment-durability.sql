-- ============================================================
-- EMI payment durability migration
-- ============================================================
-- The EMI payment flow writes these columns, but the live Supabase
-- tables don't have them, so every EMI payment mirror fails and a
-- cold start reverts the schedule to PENDING (money taken, EMI
-- "unpaid"). This adds the missing columns idempotently.
--
-- Until this runs, the mirror's generic missing-column retry keeps
-- the essential `paymentStatus = PAID` write alive (see json-db.ts).
-- ============================================================

-- Track the paid amount recorded on an instalment row.
ALTER TABLE public."emi_schedules"
  ADD COLUMN IF NOT EXISTS "paidAmount" double precision;

-- Razorpay payment id captured at completion (receipt linking).
ALTER TABLE public."emi_schedules"
  ADD COLUMN IF NOT EXISTS "transactionId" text;

-- Last successful payment timestamp on the loan account.
ALTER TABLE public."loanAccount"
  ADD COLUMN IF NOT EXISTS "lastPaymentDate" text;

-- Comfort checks — every column the code reads back on hydrate exists.
ALTER TABLE public."emi_schedules"
  ADD COLUMN IF NOT EXISTS "paidAt" text;

ALTER TABLE public."loanAccount"
  ADD COLUMN IF NOT EXISTS "paidAmount" double precision;
