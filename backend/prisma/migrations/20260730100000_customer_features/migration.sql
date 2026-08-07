-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "emiAvailable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products"("brand");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");
CREATE INDEX IF NOT EXISTS "products_createdAt_idx" ON "products"("createdAt");

-- Update seed categories
UPDATE "products" SET "category" = 'Laptops', "description" = 'Everyday performance laptop for work and study.', "emiAvailable" = true WHERE "id" = 'hp-pavilion-15';
UPDATE "products" SET "category" = 'Mobiles', "description" = 'Flagship smartphone with advanced camera system.', "emiAvailable" = true WHERE "id" = 'iphone-15';
UPDATE "products" SET "category" = 'TVs', "description" = 'Immersive 4K smart television for home entertainment.', "emiAvailable" = true WHERE "id" = 'samsung-tv';
UPDATE "products" SET "category" = 'Appliances', "description" = 'Efficient front-load washing machine.', "emiAvailable" = true WHERE "id" = 'lg-washer';
UPDATE "products" SET "category" = 'Appliances', "description" = 'Frost-free refrigerator for modern kitchens.', "emiAvailable" = true WHERE "id" = 'whirlpool-fridge';
UPDATE "products" SET "category" = 'Audio', "description" = 'Industry-leading noise cancelling headphones.', "emiAvailable" = true WHERE "id" = 'sony-headphones';

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_reviews_userId_productId_key" ON "product_reviews"("userId", "productId");
CREATE INDEX IF NOT EXISTS "product_reviews_productId_createdAt_idx" ON "product_reviews"("productId", "createdAt");

ALTER TABLE "product_reviews" DROP CONSTRAINT IF EXISTS "product_reviews_userId_fkey";
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_reviews" DROP CONSTRAINT IF EXISTS "product_reviews_productId_fkey";
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SupportIssueType" AS ENUM ('ORDER_ISSUE', 'EMI_ISSUE', 'PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "issueType" "SupportIssueType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachment" TEXT,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "support_tickets_userId_createdAt_idx" ON "support_tickets"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_tickets_status_createdAt_idx" ON "support_tickets"("status", "createdAt");

ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_userId_fkey";
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
