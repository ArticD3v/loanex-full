-- AlterTable
ALTER TABLE "users" ADD COLUMN "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "AadhaarVerificationStatus" AS ENUM ('PENDING', 'OTP_SENT', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "aadhaar_verifications" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aadhaarNumberMasked" TEXT NOT NULL,
    "aadhaarHash" TEXT NOT NULL,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "verificationStatus" "AadhaarVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aadhaar_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aadhaar_verifications_uuid_key" ON "aadhaar_verifications"("uuid");

-- CreateIndex
CREATE INDEX "aadhaar_verifications_userId_verificationStatus_idx" ON "aadhaar_verifications"("userId", "verificationStatus");

-- CreateIndex
CREATE INDEX "aadhaar_verifications_aadhaarHash_idx" ON "aadhaar_verifications"("aadhaarHash");

-- CreateIndex
CREATE INDEX "audit_logs_userId_action_idx" ON "audit_logs"("userId", "action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_createdAt_idx" ON "audit_logs"("entity", "createdAt");

-- AddForeignKey
ALTER TABLE "aadhaar_verifications" ADD CONSTRAINT "aadhaar_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
