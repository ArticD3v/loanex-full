import { jsonDb } from '../../config/json-db';

/**
 * Generate the next order number for today, e.g. LX-ORD-20260808-0007.
 *
 * Uses the MAX existing sequence number for the day rather than a row count,
 * so the DIRECT checkout path and the EMI createOnApproval path can never
 * produce the same number for two different orders. Row counts race when the
 * two flows interleave (both callers count, then both emit count+1); the max
 * is immune because each number is written only after the previous one exists
 * in the in-memory store, and node serializes these synchronous lookups.
 */
export function generateSequentialOrderNumber(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const prefix = `LX-ORD-${yyyy}${mm}${dd}-`;

  let maxSeq = 0;
  const orders = jsonDb.findMany('orders');
  for (const order of orders) {
    const stored = String(order.orderNumber ?? '');
    if (!stored.startsWith(prefix)) continue;
    const seq = parseInt(stored.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}
