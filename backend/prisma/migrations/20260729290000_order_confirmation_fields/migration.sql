-- Recreate OrderStatus enum with production values
CREATE TYPE "OrderStatus_new" AS ENUM (
  'CONFIRMED',
  'PROCESSING',
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
      WHEN "orderStatus"::text = 'PLACED' THEN 'CONFIRMED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'CONFIRMED' THEN 'CONFIRMED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'SHIPPED' THEN 'SHIPPED'::"OrderStatus_new"
      WHEN "orderStatus"::text = 'DELIVERED' THEN 'DELIVERED'::"OrderStatus_new"
      ELSE 'CONFIRMED'::"OrderStatus_new"
    END
  );

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "orders" ALTER COLUMN "orderStatus" SET DEFAULT 'CONFIRMED'::"OrderStatus";

-- Link payment + delivery/receipt fields
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentTransactionId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "estimatedDeliveryDate" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receiptPath" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_paymentTransactionId_key"
  ON "orders"("paymentTransactionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_paymentTransactionId_fkey'
  ) THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_paymentTransactionId_fkey"
      FOREIGN KEY ("paymentTransactionId")
      REFERENCES "payment_transactions"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
