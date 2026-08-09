/**
 * One-off data repair for the Mongo migration:
 *
 *  1. Addresses — legacy seed/import data marked `is_default: true` on every
 *     row (and some rows carry the pre-migration camelCase `isDefault` field).
 *     Keep only the newest default per user, unset the rest, drop the legacy
 *     field entirely.
 *  2. Orders — DIRECT checkout *sessions* are stored as `orders` rows with
 *     `PENDING` status and NO orderNumber. They are not real orders, pollute
 *     My Orders / the admin list, and are now excluded by the API. Old ones
 *     (hours old, never paid) are deleted here.
 *
 * Run: npx tsx scripts/cleanup-order-address-sync.ts
 */
import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  /* ignore if restricted */
}
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const dbName = process.env.MONGO_DB_NAME || 'loanex';

async function main() {
  if (!uri) {
    console.error('MONGODB_URI is not configured');
    process.exit(1);
  }
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20_000,
    family: 4,
  } as any);
  await client.connect();
  const db = client.db(dbName);

  // ── 1. Addresses ─────────────────────────────────────────────────────────
  const addresses = db.collection('addresses');
  const all = await addresses.find({}).toArray();
  const byUser = new Map<string, any[]>();
  for (const a of all) {
    const key = String(a.userId ?? a.profileId ?? '');
    if (!key) continue;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(a);
  }

  let defaultKept = 0;
  let defaultCleared = 0;
  let legacyCleared = 0;
  for (const [userId, rows] of byUser) {
    const defaults = rows
      .filter((r: any) => r.is_default || r.isDefault)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    if (defaults.length === 0) continue;
    // Keep the newest default for this user.
    const keep = defaults[0];
    defaultKept += 1;
    for (const r of defaults.slice(1)) {
      await addresses.updateOne({ _id: r._id }, { $set: { is_default: false }, $unset: { isDefault: '' } });
      defaultCleared += 1;
      legacyCleared += 1;
    }
  }

  // Drop the legacy camelCase field on every row (new code only reads is_default).
  const legacyResult = await addresses.updateMany(
    { isDefault: { $exists: true } },
    { $unset: { isDefault: '' } },
  );
  legacyCleared += legacyResult.modifiedCount ?? 0;

  // ── 2. Phantom checkout-session orders ───────────────────────────────────
  const orders = db.collection('orders');
  const sessionRows = await orders
    .find({ $or: [{ orderNumber: { $exists: false } }, { orderNumber: null }, { orderNumber: '' }] })
    .toArray();
  let sessionsDeleted = 0;
  for (const s of sessionRows) {
    const paid = String(s.payment_status ?? '').toUpperCase() === 'SUCCESS';
    if (paid) continue; // safety: never delete a paid row
    await orders.deleteOne({ _id: s._id });
    sessionsDeleted += 1;
  }

  console.log(
    `Addresses: kept ${defaultKept} default(s), cleared ${defaultCleared} duplicate default(s), ` +
      `removed legacy isDefault field on ${legacyCleared} row(s).`,
  );
  console.log(`Orders: deleted ${sessionsDeleted} phantom checkout-session row(s) (no orderNumber, unpaid).`);

  await client.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
