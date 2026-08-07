-- AlterEnum
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';

-- CreateEnum
CREATE TYPE "EmiApplicationStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'OFFER_ACCEPTED',
  'DOWN_PAYMENT_PENDING',
  'DOWN_PAYMENT_COMPLETED',
  'ORDER_CONFIRMED',
  'ACTIVE_EMI'
);

-- CreateTable
CREATE TABLE "emi_applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "sellingPrice" DECIMAL(12,2),
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "requestedDownPayment" DECIMAL(12,2) NOT NULL,
    "requestedTenure" INTEGER NOT NULL,
    "estimatedMonthlyEmi" DECIMAL(12,2) NOT NULL,
    "status" "EmiApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emi_applications_applicationNumber_key" ON "emi_applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "emi_applications_userId_status_idx" ON "emi_applications"("userId", "status");

-- CreateIndex
CREATE INDEX "emi_applications_status_submittedAt_idx" ON "emi_applications"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "emi_applications" ADD CONSTRAINT "emi_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
