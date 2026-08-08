import { jsonDb } from '../../config/json-db';
import { supabase } from '../../config/supabase';

/** Quantity at or below which a product reads as "Low Stock". */
export const LOW_STOCK_THRESHOLD = 5;

export type StockState = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function stockState(stock: number): StockState {
  const qty = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export interface StockDecrementItem {
  productId: string;
  quantity: number;
  variantId?: string | null;
}

export interface StockDecrementResult {
  productId: string;
  quantity: number;
  before: number;
  after: number;
  variantId?: string | null;
  variantBefore?: number;
  variantAfter?: number;
  /** True when the product-level stock change was persisted to Supabase. */
  persisted?: boolean;
}

interface ComputedDecrement {
  productId: string;
  quantity: number;
  before: number;
  after: number;
  variantId: string | null;
  variantBefore?: number;
  variantAfter?: number;
  /** Full variants array with the selected variant's stock updated. */
  variants: any[];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Shared math for a single line: compute before/after stock (product and, when
 * a variant matches, variant). Returns null when there is nothing to decrement.
 */
function computeDecrement(item: StockDecrementItem): ComputedDecrement | null {
  const quantity = Math.max(0, Math.floor(toNumber(item.quantity)));
  if (quantity === 0) return null;

  const product = jsonDb.findOne('products', { id: item.productId });
  if (!product) return null;

  const before = Math.max(0, Math.floor(toNumber(product.stock)));
  const after = Math.max(0, before - quantity);

  const variantId = item.variantId ?? null;
  let variantBefore: number | undefined;
  let variantAfter: number | undefined;
  let variants = Array.isArray(product.variants) ? product.variants : [];

  if (variantId && variants.length > 0) {
    const variantIndex = variants.findIndex((row: any) => row.id === variantId);
    if (variantIndex !== -1) {
      variantBefore = Math.max(0, Math.floor(toNumber(variants[variantIndex].stock)));
      variantAfter = Math.max(0, variantBefore - quantity);
      variants = variants.map((row: any, index: number) =>
        index === variantIndex ? { ...row, stock: variantAfter } : row,
      );
    }
  }

  return {
    productId: item.productId,
    quantity,
    before,
    after,
    variantId,
    ...(variantBefore !== undefined ? { variantBefore, variantAfter } : {}),
    variants,
  };
}

function buildLocalPayload(c: ComputedDecrement): Record<string, any> {
  return {
    stock: c.after,
    // Only rewrite the variants array when we actually adjusted a variant,
    // so unrelated variant fields are never clobbered by a stale read.
    ...(c.variantId && c.variantBefore !== undefined ? { variants: c.variants } : {}),
  };
}

function toResult(c: ComputedDecrement): StockDecrementResult {
  return {
    productId: c.productId,
    quantity: c.quantity,
    before: c.before,
    after: c.after,
    variantId: c.variantId,
    ...(c.variantBefore !== undefined ? { variantBefore: c.variantBefore, variantAfter: c.variantAfter } : {}),
  };
}

const looksLikeMissingColumn = (message: string) =>
  /PGRST204|could not find the .*column|column .* does not exist/i.test(message);

/**
 * Durable decrement — the same math, but the stock change is written DIRECTLY
 * to Supabase and awaited, so it survives cold starts, other serverless
 * instances, and the source-mode catalog refresh that re-hydrates products
 * from Supabase (which would otherwise wipe an in-memory-only decrement).
 *
 * Steps per line:
 *  1. `jsonDb.updateLocal` — update the in-memory copy immediately (no mirror,
 *     avoiding a second fire-and-forget write).
 *  2. `products.stock` — atomic server-side decrement via the
 *     `decrement_product_stock` PostgREST RPC (defined in
 *     backend/inventory-durability.sql). Atomicity prevents the lost-update
 *     race where two concurrent purchases on different instances both read
 *     the same stock and both write the same reduced value (oversell). If the
 *     RPC has not been deployed yet (PGRST202), fall back to an absolute
 *     read-modify-write of `stock`. The write is retried once on error;
 *     failure is logged loudly but does NOT throw, because a paid order must
 *     never be stranded by an inventory hiccup.
 *  3. Variant sub-stock — best-effort write of the `variants` JSONB column.
 *     That column only exists once inventory-durability.sql has been applied;
 *     when it is missing (PGRST204) we log once and continue — product-level
 *     stock is still durable.
 *
 * Exactly-once responsibility stays with the callers (the DIRECT/EMI payment
 * completion paths short-circuit on SUCCESS before reaching here).
 *
 * Tradeoffs (documented for posterity):
 *  - If the durable write fails, the in-memory copy was already decremented;
 *    the next source-mode catalog refresh re-hydrates the pre-decrement value
 *    from Supabase, silently reverting it. Logged loudly; the atomic RPC makes
 *    a partial/racy write impossible, so this only matters while the RPC is
 *    absent.
 *  - Callers decrement BEFORE marking the transaction SUCCESS. If the process
 *    dies mid-request after the decrement but before the SUCCESS write, a
 *    client replay would decrement again. This ordering predates the durable
 *    write and the window is tiny; marking SUCCESS first would instead risk a
 *    permanently lost decrement (replays short-circuit on SUCCESS).
 */
export async function decrementStockDurable(
  items: StockDecrementItem[],
): Promise<StockDecrementResult[]> {
  const results: StockDecrementResult[] = [];

  for (const item of items) {
    const c = computeDecrement(item);
    if (!c) continue;

    jsonDb.updateLocal('products', { id: item.productId }, buildLocalPayload(c));

    // 1) Product-level stock — atomic when the RPC is deployed, else an
    //    absolute update. Retry once, then log and continue rather than throw
    //    (a confirmed, paid order must not 500).
    const now = new Date().toISOString();
    let stockPersisted = false;

    const viaRpc = async () =>
      supabase.rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_qty: c.quantity,
      });

    let rpc = await viaRpc();
    if (rpc.error) {
      // Any RPC error (missing function PGRST202, transient network/DB failure)
      // falls back to an absolute write of the same computed value. That is
      // idempotent even if the RPC actually committed before a lost response,
      // because c.after is already the post-decrement value in memory — so no
      // double-decrement, strictly more durable than logging and giving up.
      console.error(
        `[Inventory] durable stock RPC failed for ${item.productId} (${c.before}->${c.after}): ${rpc.error.message} — falling back to absolute write`,
      );
      const writeAbs = async () =>
        supabase.from('products').update({ stock: c.after, updatedAt: now }).eq('id', item.productId);
      let { error } = await writeAbs();
      if (error) {
        const retried = await writeAbs();
        error = retried.error;
      }
      if (error) {
        console.error(
          `[Inventory] durable stock update FAILED for ${item.productId} (${c.before}->${c.after}): ${error.message}`,
        );
      } else {
        stockPersisted = true;
      }
    } else {
      // data is the new stock returned by the RPC. null means the product row
      // does not exist in Supabase (e.g. a mirror-mode-only product) — nothing
      // was persisted; 0 is a real persisted value (sold out).
      stockPersisted = rpc.data != null;
    }

    // 2) Variant sub-stock — best-effort (variants JSONB column may be absent).
    if (item.variantId && c.variantBefore !== undefined) {
      try {
        const { error: variantError } = await supabase
          .from('products')
          .update({ variants: c.variants, updatedAt: now })
          .eq('id', item.productId);
        if (variantError) {
          if (looksLikeMissingColumn(variantError.message)) {
            console.warn(
              '[Inventory] products.variants column missing in Supabase — variant sub-stock not mirrored ' +
                '(product stock is still durable). Apply inventory-durability.sql to enable variant durability.',
            );
          } else {
            console.warn('[Inventory] variant stock mirror failed:', variantError.message);
          }
        }
      } catch (e) {
        console.warn('[Inventory] variant stock mirror threw:', e);
      }
    }

    results.push({
      ...toResult(c),
      ...(stockPersisted ? { persisted: true as const } : {}),
    });
  }

  return results;
}
