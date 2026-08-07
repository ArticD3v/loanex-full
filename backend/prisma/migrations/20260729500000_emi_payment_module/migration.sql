-- EMI payment support: link transactions to schedule + loan paid tracking

ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "emiScheduleId" TEXT;
ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "receiptPath" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_emiScheduleId_key"
  ON "payment_transactions"("emiScheduleId");

CREATE INDEX IF NOT EXISTS "payment_transactions_paymentType_paymentStatus_idx"
  ON "payment_transactions"("paymentType", "paymentStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_emiScheduleId_fkey'
  ) THEN
    ALTER TABLE "payment_transactions"
      ADD CONSTRAINT "payment_transactions_emiScheduleId_fkey"
      FOREIGN KEY ("emiScheduleId") REFERENCES "emi_schedule"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "emi_schedule" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2);
ALTER TABLE "emi_schedule" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;

ALTER TABLE "loan_accounts" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "loan_accounts" ADD COLUMN IF NOT EXISTS "nextEmiDueDate" TIMESTAMP(3);
ALTER TABLE "loan_accounts" ADD COLUMN IF NOT EXISTS "lastPaymentDate" TIMESTAMP(3);

-- Seed next due date for existing loans from first unpaid EMI
UPDATE "loan_accounts" la
SET "nextEmiDueDate" = sub."dueDate"
FROM (
  SELECT DISTINCT ON (es."loanAccountId")
    es."loanAccountId",
    es."dueDate"
  FROM "emi_schedule" es
  WHERE es."paymentStatus" IN ('PENDING', 'OVERDUE')
  ORDER BY es."loanAccountId", es."emiNumber" ASC
) sub
WHERE la."id" = sub."loanAccountId"
  AND la."nextEmiDueDate" IS NULL;
