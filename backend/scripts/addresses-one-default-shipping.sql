-- ONE default shipping address per profile/user (PostgreSQL / Supabase).
-- Safe to apply only when no user currently has multiple is_default = true rows.
--
-- Pre-check:
--   SELECT profile_id, COUNT(*)
--   FROM addresses
--   WHERE is_default = true AND profile_id IS NOT NULL
--   GROUP BY profile_id
--   HAVING COUNT(*) > 1;
--
-- Do NOT auto-delete historical duplicate address content rows.
-- This index only enforces a single DEFAULT, not unique address content.

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_profile_idx
  ON public.addresses (profile_id)
  WHERE is_default = true AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user_idx
  ON public.addresses (user_id)
  WHERE is_default = true AND user_id IS NOT NULL;
