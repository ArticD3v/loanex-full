-- ============================================================
-- Inventory durability — atomic stock decrement + variant column
-- ============================================================
-- The backend writes product-level stock to products.stock on every confirmed
-- payment (durable in both sync modes). Variant stock lives in the
-- products.variants JSONB array (matching how the codebase stores variants —
-- the admin product wizard writes variants as JSONB on products).
--
-- This file provides the two pieces the backend's durable decrement relies on:
--   1. products.variants JSONB column — declared in admin-supabase-setup.sql
--      too, but may not have been applied to an existing Supabase project.
--      Without it, variant sub-stock writes are skipped (product-level stock
--      is still durable).
--   2. decrement_product_stock(text, integer) RPC — performs the stock
--      decrement atomically server-side (UPDATE ... SET stock = GREATEST(...)),
--      so two concurrent purchases on different serverless instances cannot
--      both read the same stock and both write the same reduced value
--      (lost-update oversell). The backend falls back to a read-modify-write
--      when the RPC is absent, so the app still works until this is applied.
--
-- NOTE: the normalized public.product_variants table from supabase-migration.sql
-- is NOT used — it references products(id) as uuid while the live products.id is
-- text/varchar, so that table cannot be created against the current schema, and
-- the backend reads/writes variants as embedded JSONB everywhere.
--
-- Run in the Supabase SQL Editor (public schema). Safe to run multiple times.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "variants" JSONB;

-- Atomic decrement used by the durable inventory path. Returns the new stock
-- (NULL when the product row does not exist — e.g. a mirror-mode-only product).
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id text,
  p_qty integer
)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE public.products
  SET stock = GREATEST(COALESCE(stock, 0) - GREATEST(COALESCE(p_qty, 0), 0), 0),
      "updatedAt" = now()
  WHERE id = p_product_id
  RETURNING stock;
$$;
