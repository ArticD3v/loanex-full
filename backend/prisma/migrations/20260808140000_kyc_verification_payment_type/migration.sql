-- Lifetime one-time KYC verification fee (₹299) via Razorpay.
-- Supabase paymentTransaction.paymentType is VARCHAR — no enum alter required there.
-- Native Postgres PaymentType enum (if present) gains the new value.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN
    ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'KYC_VERIFICATION';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
