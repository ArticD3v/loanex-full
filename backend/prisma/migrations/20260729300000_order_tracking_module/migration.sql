CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate OrderStatus with tracking-aligned values
CREATE TYPE "OrderStatus_new" AS ENUM (
  'ORDER_CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
);

ALTER TABLE "orders" ALTER COLUMN "orderStatus" DROP DEFAULT;

ALTER TABLE "orders"
  ALTER COLUMN "orderStatus" TYPE "OrderStatus_new"
  USING (
    CASE
      WHEN "orderStatus"::text = 'CONFIRMED' THEN 'ORDER_CONFIRMED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'ORDER_CONFIRMED' THEN 'ORDER_CONFIRMED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'PROCESSING' THEN 'PROCESSING'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'PACKED' THEN 'PACKED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'SHIPPED' THEN 'SHIPPED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'OUT_FOR_DELIVERY' THEN 'OUT_FOR_DELIVERY'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'DELIVERED' THEN 'DELIVERED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'CANCELLED' THEN 'CANCELLED'::"OrderStatus_new"
      ELSE 'ORDER_CONFIRMED'::"OrderStatus_new"
    END
  );

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
ALTER TABLE "orders" ALTER COLUMN "orderStatus" SET DEFAULT 'ORDER_CONFIRMED'::"OrderStatus";

-- Shipping / product summary fields
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "productBrand" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoicePath" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courierPartner" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "warehouse" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;

CREATE INDEX IF NOT EXISTS "orders_orderStatus_updatedAt_idx"
  ON "orders"("orderStatus", "updatedAt");

-- Tracking history table
CREATE TYPE "OrderTrackingStatus" AS ENUM (
  'ORDER_CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
);

CREATE TABLE IF NOT EXISTS "order_tracking" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "OrderTrackingStatus" NOT NULL,
  "remarks" TEXT,
  "updatedBy" TEXT,
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_tracking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_tracking_orderId_createdAt_idx"
  ON "order_tracking"("orderId", "createdAt");

CREATE INDEX IF NOT EXISTS "order_tracking_status_createdAt_idx"
  ON "order_tracking"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_tracking_orderId_fkey'
  ) THEN
    ALTER TABLE "order_tracking"
      ADD CONSTRAINT "order_tracking_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed initial tracking for existing confirmed orders
INSERT INTO "order_tracking" ("id", "orderId", "status", "remarks", "updatedBy", "location", "createdAt")
SELECT
  gen_random_uuid()::text,
  o."id",
  'ORDER_CONFIRMED'::"OrderTrackingStatus",
  'Order confirmed after successful down payment',
  'system',
  'LoanEx Warehouse',
  o."createdAt"
FROM "orders" o
WHERE NOT EXISTS (
  SELECT 1 FROM "order_tracking" t WHERE t."orderId" = o."id"
);
