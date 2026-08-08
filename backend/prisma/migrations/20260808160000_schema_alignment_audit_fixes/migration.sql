-- Align runtime json-db fields with Prisma / Postgres (non-destructive).

ALTER TABLE "public"."banners"
  ADD COLUMN IF NOT EXISTS "placement" TEXT DEFAULT 'home';

ALTER TABLE "public"."categories"
  ADD COLUMN IF NOT EXISTS "parentId" UUID;

ALTER TABLE "public"."job_openings"
  ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE INDEX IF NOT EXISTS "job_openings_slug_idx" ON "public"."job_openings"("slug");

-- PaymentType: add FULL_PAYMENT for DIRECT checkout transactions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'PaymentType'
      AND e.enumlabel = 'FULL_PAYMENT'
  ) THEN
    ALTER TYPE "public"."PaymentType" ADD VALUE 'FULL_PAYMENT';
  END IF;
END $$;
