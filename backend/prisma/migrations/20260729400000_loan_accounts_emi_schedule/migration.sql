-- Loan accounts + EMI schedule for EMI Dashboard

CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

CREATE TYPE "EmiPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'FAILED');

CREATE TABLE "loan_accounts" (
  "id" TEXT NOT NULL,
  "loanAccountNumber" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "loanAmount" DECIMAL(12,2) NOT NULL,
  "interestRate" DECIMAL(5,2) NOT NULL,
  "processingFee" DECIMAL(12,2) NOT NULL,
  "loanTenure" INTEGER NOT NULL,
  "emiAmount" DECIMAL(12,2) NOT NULL,
  "totalInterest" DECIMAL(12,2) NOT NULL,
  "totalPayable" DECIMAL(12,2) NOT NULL,
  "outstandingAmount" DECIMAL(12,2) NOT NULL,
  "loanStatus" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
  "loanStartDate" TIMESTAMP(3) NOT NULL,
  "loanEndDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loan_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loan_accounts_loanAccountNumber_key" ON "loan_accounts"("loanAccountNumber");
CREATE UNIQUE INDEX "loan_accounts_applicationId_key" ON "loan_accounts"("applicationId");
CREATE INDEX "loan_accounts_userId_loanStatus_idx" ON "loan_accounts"("userId", "loanStatus");
CREATE INDEX "loan_accounts_loanStatus_createdAt_idx" ON "loan_accounts"("loanStatus", "createdAt");

ALTER TABLE "loan_accounts"
  ADD CONSTRAINT "loan_accounts_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "emi_applications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loan_accounts"
  ADD CONSTRAINT "loan_accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "emi_schedule" (
  "id" TEXT NOT NULL,
  "loanAccountId" TEXT NOT NULL,
  "emiNumber" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "principalAmount" DECIMAL(12,2) NOT NULL,
  "interestAmount" DECIMAL(12,2) NOT NULL,
  "emiAmount" DECIMAL(12,2) NOT NULL,
  "remainingBalance" DECIMAL(12,2) NOT NULL,
  "paymentStatus" "EmiPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "emi_schedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emi_schedule_loanAccountId_emiNumber_key"
  ON "emi_schedule"("loanAccountId", "emiNumber");

CREATE INDEX "emi_schedule_loanAccountId_paymentStatus_dueDate_idx"
  ON "emi_schedule"("loanAccountId", "paymentStatus", "dueDate");

CREATE INDEX "emi_schedule_paymentStatus_dueDate_idx"
  ON "emi_schedule"("paymentStatus", "dueDate");

ALTER TABLE "emi_schedule"
  ADD CONSTRAINT "emi_schedule_loanAccountId_fkey"
  FOREIGN KEY ("loanAccountId") REFERENCES "loan_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
