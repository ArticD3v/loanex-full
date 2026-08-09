import { jsonDb } from '../../config/json-db';
import { getMongoDb } from '../../config/mongo';

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
  /** True when the product-level stock change was persisted durably to MongoDB. */
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

/**
 * Restore stock after an order is cancelled. Mirror of decrementStockDurable
 * with opposite sign: product + variant stock are incremented in-memory and
 * persisted durably to MongoDB ($inc).
 */
export async function restoreStockDurable(
  items: StockDecrementItem[],
): Promise<StockDecrementResult[]> {
  const results: StockDecrementResult[] = [];

  for (const item of items) {
    const c = computeDecrement(item); // before/after of the ORIGINAL decrement
    if (!c) continue;
    const restored = Math.max(0, Math.floor(toNumber(item.quantity)));
    if (restored === 0) continue;

    const product = jsonDb.findOne('products', { id: item.productId });
    const current = Math.max(0, Math.floor(toNumber(product?.stock)));
    const after = current + restored;
    const variants =
      item.variantId && c.variantBefore !== undefined && Array.isArray(product?.variants)
        ? product.variants.map((row: any) =>
            String(row.id) === String(item.variantId)
              ? { ...row, stock: Math.max(0, Math.floor(toNumber(row.stock)) + restored) }
              : row,
          )
        : undefined;

    const payload: Record<string, any> = {
      stock: after,
      ...(variants ? { variants } : {}),
    };
    jsonDb.updateLocal('products', { id: item.productId }, payload);

    const now = new Date().toISOString();
    let stockPersisted = false;

    try {
      const db = await getMongoDb();
      const result = await db.collection('products').findOneAndUpdate(
        { _id: item.productId as any },
        {
          $inc: { stock: restored },
          $set: {
            updatedAt: now,
            ...(variants ? { variants } : {}),
          },
        },
        { returnDocument: 'after' },
      );
      stockPersisted = Boolean(result);
    } catch (e) {
      console.error(
        `[Inventory] Mongo durable stock restore FAILED for ${item.productId}: ${String(e)}`,
      );
    }
    results.push({
      productId: item.productId,
      quantity: restored,
      before: current,
      after,
      variantId: item.variantId ?? null,
      ...(stockPersisted ? { persisted: true as const } : {}),
    });
    continue;
  }

  return results;
}

/**
 * Durable decrement — the same math, but the stock change is written DIRECTLY
 * to MongoDB and awaited, so it survives cold starts, other serverless
 * instances, and the catalog refresh that re-hydrates products from Mongo
 * (which would otherwise wipe an in-memory-only decrement).
 *
 * Steps per line:
 *  1. `jsonDb.updateLocal` — update the in-memory copy immediately (no mirror,
 *     avoiding a second fire-and-forget write).
 *  2. `products.stock` — atomic server-side decrement via Mongo
 *     `findOneAndUpdate` with `$inc`. Atomicity prevents the lost-update race
 *     where two concurrent purchases on different instances both read the
 *     same stock and both write the same reduced value (oversell). Failure is
 *     logged loudly but does NOT throw, because a paid order must never be
 *     stranded by an inventory hiccup.
 *  3. Variant sub-stock — updated in the same `$set` when a variant matched.
 *
 * Exactly-once responsibility stays with the callers (the DIRECT/EMI payment
 * completion paths short-circuit on SUCCESS before reaching here).
 *
 * Tradeoffs (documented for posterity):
 *  - If the durable write fails, the in-memory copy was already decremented;
 *    the next catalog refresh re-hydrates the pre-decrement value from Mongo,
 *    silently reverting it. Logged loudly; the atomic $inc makes a partial/
 *    racy write impossible, so this only matters if Mongo is unreachable.
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

    const now = new Date().toISOString();
    let stockPersisted = false;

    try {
      const db = await getMongoDb();
      const result = await db.collection('products').findOneAndUpdate(
        { _id: item.productId as any },
        {
          $inc: { stock: -c.quantity },
          $set: {
            updatedAt: now,
            ...(item.variantId && c.variantBefore !== undefined
              ? { variants: c.variants }
              : {}),
          },
        },
        { returnDocument: 'after' },
      );
      stockPersisted = Boolean(result);
      if (result && typeof (result as any).stock === 'number' && (result as any).stock < 0) {
        await db.collection('products').updateOne(
          { _id: item.productId as any },
          { $set: { stock: 0, updatedAt: now } },
        );
      }
    } catch (e) {
      console.error(
        `[Inventory] Mongo durable stock update FAILED for ${item.productId} (${c.before}->${c.after}): ${String(e)}`,
      );
    }
    results.push({
      ...toResult(c),
      ...(stockPersisted ? { persisted: true as const } : {}),
    });
    continue;
  }

  return results;
}
