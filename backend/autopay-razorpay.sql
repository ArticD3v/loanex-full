-- LoanEx — AutoPay payment-method enum values (UPI/eMandate/NACH/debit card).
-- Run once against Supabase (SQL Editor) so autopayMandate rows created with
-- EMANDATE / NACH / DEBIT_CARD mirror successfully.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type t ON t.oid = pg_enum.enumtypid
    WHERE t.typname = 'AutopayPaymentMethod' AND pg_enum.enumlabel = 'EMANDATE'
  ) THEN
    ALTER TYPE "AutopayPaymentMethod" ADD VALUE 'EMANDATE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type t ON t.oid = pg_enum.enumtypid
    WHERE t.typname = 'AutopayPaymentMethod' AND pg_enum.enumlabel = 'NACH'
  ) THEN
    ALTER TYPE "AutopayPaymentMethod" ADD VALUE 'NACH';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type t ON t.oid = pg_enum.enumtypid
    WHERE t.typname = 'AutopayPaymentMethod' AND pg_enum.enumlabel = 'DEBIT_CARD'
  ) THEN
    ALTER TYPE "AutopayPaymentMethod" ADD VALUE 'DEBIT_CARD';
  END IF;
END $$;
