-- AlterTable
ALTER TABLE "emi_applications" ADD COLUMN "approvedAmount" DECIMAL(12,2);
ALTER TABLE "emi_applications" ADD COLUMN "approvedTenure" INTEGER;
ALTER TABLE "emi_applications" ADD COLUMN "approvedDownPayment" DECIMAL(12,2);
ALTER TABLE "emi_applications" ADD COLUMN "rejectionReason" TEXT;
