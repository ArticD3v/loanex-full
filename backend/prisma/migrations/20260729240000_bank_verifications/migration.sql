-- AlterTable
ALTER TABLE "users" ADD COLUMN "bankVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CURRENT');

-- CreateEnum
CREATE TYPE "BankVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "bank_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "accountNumberHash" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "accountType" "BankAccountType" NOT NULL,
    "status" "BankVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_verifications_userId_status_idx" ON "bank_verifications"("userId", "status");

-- CreateIndex
CREATE INDEX "bank_verifications_accountNumberHash_idx" ON "bank_verifications"("accountNumberHash");

-- AddForeignKey
ALTER TABLE "bank_verifications" ADD CONSTRAINT "bank_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
