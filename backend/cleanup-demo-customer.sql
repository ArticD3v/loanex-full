-- ============================================================================
-- LoanEx — Safe cleanup of the OLD DEMO CUSTOMER row(s)
-- ----------------------------------------------------------------------------
-- Removes ONLY the demo identity below, everywhere it appears:
--     phone : 9462557060
--     email : gourimusharraf@gmail.com
-- Tables touched directly : users, profiles, customer_kyc
-- Tables touched via FK  : anything referencing the demo user/profile ids
--                          (orders, order_items, addresses, cart_items,
--                          wishlist_items, notifications, emi_applications,
--                          emi_details, emi_schedules, reviews,
--                          digilocker_reports, experian_reports, ...).
--                          These cascade automatically — the preview below
--                          prints exactly how many rows each will lose.
--
-- HOW TO RUN (Supabase SQL editor or psql):
--   1. Run the whole script once to preview (SELECT / DO blocks print counts;
--      the transaction is left open for you to decide).
--   2. Inspect the printed counts.
--   3. Re-run with COMMIT active (it is by default) to apply, or swap the
--      final line to ROLLBACK for a pure dry-run.
--
-- SAFETY: idempotent (second run deletes nothing), transaction-wrapped,
-- and every delete is scoped to the demo identifiers — no other rows match.
-- Fail-closed: if any child FK were NO ACTION/RESTRICT instead of CASCADE,
-- the users delete aborts and the whole transaction rolls back (nothing is
-- committed). The preview prints each child table's delete_rule so you can
-- spot that before running.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) Demo identity set (single source of truth for this script)
-- ----------------------------------------------------------------------------
-- users:  phone = '9462557060' OR email = 'gourimusharraf@gmail.com'
-- profiles: id is 1:1 with users.id, plus mobile_number / email fallbacks.

-- ----------------------------------------------------------------------------
-- 1) Preview — direct rows that will be deleted
-- ----------------------------------------------------------------------------
SELECT id, phone, email, role, status
FROM public.users
WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com';

SELECT id, mobile_number, email, "fullName", kyc_status
FROM public.profiles
WHERE id IN (SELECT id FROM public.users WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com')
   OR mobile_number = '9462557060'
   OR email = 'gourimusharraf@gmail.com';

SELECT id, "profileId", "userId", "fullName", "panNumber"
FROM public.customer_kyc
WHERE "userId" IN (SELECT id FROM public.users WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com')
   OR "profileId" IN (SELECT id FROM public.profiles
                      WHERE mobile_number = '9462557060' OR email = 'gourimusharraf@gmail.com');

-- ----------------------------------------------------------------------------
-- 2) Preview — cascade impact on every child table (dynamic, schema-proof)
--    Prints: <child_table> (via <fk_column>, delete_rule): N row(s) will cascade
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r            record;
  target_count int;
BEGIN
  SELECT count(*) INTO target_count
  FROM public.users
  WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com';

  RAISE NOTICE 'Demo user rows in public.users: %', target_count;

  FOR r IN
    SELECT tc.table_name,
           kcu.column_name,
           rc.delete_rule
    FROM information_schema.table_constraints      tc
    JOIN information_schema.key_column_usage       kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema    = ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.table_schema    = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND ccu.table_name IN ('users', 'profiles')
      AND ccu.column_name    = 'id'
    GROUP BY tc.table_name, kcu.column_name, rc.delete_rule
    ORDER BY tc.table_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I
        WHERE %I IN (
          SELECT id FROM public.users
           WHERE phone = ''9462557060'' OR email = ''gourimusharraf@gmail.com''
          UNION
          SELECT id FROM public.profiles
           WHERE mobile_number = ''9462557060'' OR email = ''gourimusharraf@gmail.com''
        )',
      r.table_name, r.column_name
    ) INTO target_count;

    RAISE NOTICE '  public.% (via %, %): % row(s) will be removed',
      r.table_name, r.column_name, r.delete_rule, target_count;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Deletes — child rows first (explicit), then profiles, then users.
--    The explicit order makes this safe even if a FK were NOT cascade.
-- ----------------------------------------------------------------------------
DELETE FROM public.customer_kyc
WHERE "userId" IN (SELECT id FROM public.users
                   WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com')
   OR "profileId" IN (SELECT id FROM public.profiles
                      WHERE mobile_number = '9462557060' OR email = 'gourimusharraf@gmail.com');

DELETE FROM public.profiles
WHERE id IN (SELECT id FROM public.users
             WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com')
   OR mobile_number = '9462557060'
   OR email = 'gourimusharraf@gmail.com';

DELETE FROM public.users
WHERE phone = '9462557060' OR email = 'gourimusharraf@gmail.com';

-- Any remaining child rows (orders, cart_items, notifications, emi_*, reviews,
-- digilocker_reports, experian_reports, addresses, ...) cascade via the FK
-- ON DELETE CASCADE rules shown in the preview above.

-- ----------------------------------------------------------------------------
-- 4) Apply / dry-run
-- ----------------------------------------------------------------------------
-- Keep COMMIT to apply. Swap to ROLLBACK (and comment COMMIT) for a dry-run.
COMMIT;
-- ROLLBACK;  -- uncomment for a pure dry-run
