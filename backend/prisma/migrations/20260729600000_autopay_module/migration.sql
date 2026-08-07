-- AutoPay mandates + notifications

ALTER TABLE "loan_accounts" ADD COLUMN IF NOT EXISTS "autopayEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "AutopayMandateStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'PAUSED',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "AutopayPaymentMethod" AS ENUM (
  'UPI_AUTOPAY',
  'EMANDATE',
  'NACH',
  'DEBIT_CARD'
);

CREATE TYPE "AutopayProviderCode" AS ENUM (
  'STUB',
  'RAZORPAY'
);

CREATE TABLE "autopay_mandates" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loanAccountId" TEXT NOT NULL,
  "provider" "AutopayProviderCode" NOT NULL DEFAULT 'STUB',
  "mandateId" TEXT NOT NULL,
  "mandateReference" TEXT NOT NULL,
  "paymentMethod" "AutopayPaymentMethod" NOT NULL,
  "bankName" TEXT,
  "upiId" TEXT,
  "maximumDebitAmount" DECIMAL(12,2) NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "nextDebitDate" TIMESTAMP(3),
  "status" "AutopayMandateStatus" NOT NULL DEFAULT 'PENDING',
  "providerPayload" JSONB,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "autopay_mandates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "autopay_mandates_mandateReference_key" ON "autopay_mandates"("mandateReference");
CREATE INDEX "autopay_mandates_userId_status_idx" ON "autopay_mandates"("userId", "status");
CREATE INDEX "autopay_mandates_loanAccountId_status_idx" ON "autopay_mandates"("loanAccountId", "status");
CREATE INDEX "autopay_mandates_mandateId_idx" ON "autopay_mandates"("mandateId");

ALTER TABLE "autopay_mandates"
  ADD CONSTRAINT "autopay_mandates_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "autopay_mandates"
  ADD CONSTRAINT "autopay_mandates_loanAccountId_fkey"
  FOREIGN KEY ("loanAccountId") REFERENCES "loan_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "notifications_event_createdAt_idx" ON "notifications"("event", "createdAt");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
