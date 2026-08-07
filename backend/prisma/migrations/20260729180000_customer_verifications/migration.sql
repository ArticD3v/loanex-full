-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "customer_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
    "panVerified" BOOLEAN NOT NULL DEFAULT false,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_verifications_userId_key" ON "customer_verifications"("userId");

ALTER TABLE "customer_verifications" ADD CONSTRAINT "customer_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;