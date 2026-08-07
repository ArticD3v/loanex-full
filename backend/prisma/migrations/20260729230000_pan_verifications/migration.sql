-- AlterTable
ALTER TABLE "users" ADD COLUMN "panVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "PanVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "pan_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "panNumberMasked" TEXT NOT NULL,
    "panHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "status" "PanVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pan_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pan_verifications_userId_status_idx" ON "pan_verifications"("userId", "status");

-- CreateIndex
CREATE INDEX "pan_verifications_panHash_idx" ON "pan_verifications"("panHash");

-- AddForeignKey
ALTER TABLE "pan_verifications" ADD CONSTRAINT "pan_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
