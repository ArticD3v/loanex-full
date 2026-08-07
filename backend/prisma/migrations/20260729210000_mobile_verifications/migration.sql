-- CreateEnum
CREATE TYPE "MobileVerificationPurpose" AS ENUM ('MOBILE_VERIFICATION');

-- CreateTable
CREATE TABLE "mobile_verifications" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "purpose" "MobileVerificationPurpose" NOT NULL DEFAULT 'MOBILE_VERIFICATION',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_verifications_uuid_key" ON "mobile_verifications"("uuid");

-- CreateIndex
CREATE INDEX "mobile_verifications_userId_isUsed_isVerified_idx" ON "mobile_verifications"("userId", "isUsed", "isVerified");

-- CreateIndex
CREATE INDEX "mobile_verifications_mobile_purpose_isUsed_idx" ON "mobile_verifications"("mobile", "purpose", "isUsed");

-- AddForeignKey
ALTER TABLE "mobile_verifications" ADD CONSTRAINT "mobile_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
