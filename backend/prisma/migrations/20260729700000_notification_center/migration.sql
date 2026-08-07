-- Notification Center schema upgrade

CREATE TYPE "NotificationType" AS ENUM (
  'APPLICATION_SUBMITTED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'OFFER_RECEIVED',
  'OFFER_ACCEPTED',
  'DOWN_PAYMENT_SUCCESS',
  'ORDER_CONFIRMED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'EMI_DUE_REMINDER',
  'EMI_OVERDUE',
  'EMI_PAID',
  'EMI_FAILED',
  'AUTOPAY_SUCCESS',
  'AUTOPAY_FAILED',
  'LOAN_CLOSED',
  'SYSTEM'
);

CREATE TYPE "NotificationCategory" AS ENUM (
  'LOAN',
  'ORDERS',
  'PAYMENTS',
  'OFFERS',
  'SYSTEM'
);

CREATE TYPE "NotificationPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" "NotificationType";
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill type from legacy event column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'event'
  ) THEN
    UPDATE "notifications"
    SET "type" = CASE
      WHEN "event" ILIKE '%APPROVED%' THEN 'APPLICATION_APPROVED'::"NotificationType"
      WHEN "event" ILIKE '%REJECTED%' THEN 'APPLICATION_REJECTED'::"NotificationType"
      WHEN "event" ILIKE '%SUBMITTED%' THEN 'APPLICATION_SUBMITTED'::"NotificationType"
      WHEN "event" ILIKE '%OFFER%' THEN 'OFFER_RECEIVED'::"NotificationType"
      WHEN "event" ILIKE '%DOWN_PAYMENT%' OR "event" ILIKE '%PAYMENT_SUCCESS%' THEN 'DOWN_PAYMENT_SUCCESS'::"NotificationType"
      WHEN "event" ILIKE '%ORDER_CONFIRMED%' THEN 'ORDER_CONFIRMED'::"NotificationType"
      WHEN "event" ILIKE '%SHIPPED%' THEN 'ORDER_SHIPPED'::"NotificationType"
      WHEN "event" ILIKE '%DELIVERED%' THEN 'ORDER_DELIVERED'::"NotificationType"
      WHEN "event" ILIKE '%EMI_PAID%' OR "event" ILIKE '%EMI_PAYMENT_SUCCESS%' THEN 'EMI_PAID'::"NotificationType"
      WHEN "event" ILIKE '%EMI_FAILED%' OR "event" ILIKE '%EMI_PAYMENT_FAILED%' THEN 'EMI_FAILED'::"NotificationType"
      WHEN "event" ILIKE '%AUTO_PAY_ENABLED%' OR "event" ILIKE '%AUTOPAY_SUCCESS%' THEN 'AUTOPAY_SUCCESS'::"NotificationType"
      WHEN "event" ILIKE '%AUTO_PAY_FAILED%' OR "event" ILIKE '%AUTOPAY_FAILED%' THEN 'AUTOPAY_FAILED'::"NotificationType"
      WHEN "event" ILIKE '%AUTO_PAY_DISABLED%' THEN 'SYSTEM'::"NotificationType"
      WHEN "event" ILIKE '%LOAN_CLOSED%' THEN 'LOAN_CLOSED'::"NotificationType"
      ELSE 'SYSTEM'::"NotificationType"
    END
    WHERE "type" IS NULL;

    ALTER TABLE "notifications" DROP COLUMN IF EXISTS "event";
  END IF;
END $$;

UPDATE "notifications" SET "type" = 'SYSTEM'::"NotificationType" WHERE "type" IS NULL;
ALTER TABLE "notifications" ALTER COLUMN "type" SET NOT NULL;

UPDATE "notifications"
SET "isRead" = true, "readAt" = COALESCE("readAt", "createdAt")
WHERE "readAt" IS NOT NULL AND "isRead" = false;

DROP INDEX IF EXISTS "notifications_event_createdAt_idx";
DROP INDEX IF EXISTS "notifications_userId_createdAt_idx";

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx"
  ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_category_createdAt_idx"
  ON "notifications"("userId", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_type_createdAt_idx"
  ON "notifications"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_archived_createdAt_idx"
  ON "notifications"("userId", "archived", "createdAt");
