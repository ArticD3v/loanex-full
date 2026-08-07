-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "EmiApplicationStatus" ADD VALUE 'DECLINED_BY_CUSTOMER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "emi_applications" ADD COLUMN IF NOT EXISTS "monthlyEmi" DECIMAL(12,2);
ALTER TABLE "emi_applications" ADD COLUMN IF NOT EXISTS "interestRate" DECIMAL(5,2);
ALTER TABLE "emi_applications" ADD COLUMN IF NOT EXISTS "processingFee" DECIMAL(12,2);
ALTER TABLE "emi_applications" ADD COLUMN IF NOT EXISTS "offerAcceptedAt" TIMESTAMP(3);
ALTER TABLE "emi_applications" ADD COLUMN IF NOT EXISTS "offerDeclinedAt" TIMESTAMP(3);
