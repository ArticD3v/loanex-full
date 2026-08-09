/**
 * One-way sync: Supabase → MongoDB (idempotent, non-destructive).
 *
 * Why: the backend now runs Mongo-primary (DATA_PRIMARY=auto + MONGODB_URI),
 * but MongoDB only holds the original migration snapshot while Supabase holds
 * the live records (orders, loans, schedules, payments, KYC). This script
 * brings MongoDB up to date so Mongo-primary serves the same data.
 *
 * Reconciliation:
 *  - Users are matched by phone/email. When MongoDB already has a user with the
 *    same phone, that Mongo id becomes canonical and the Supabase user row is
 *    NOT duplicated — child rows (orders, profiles, applications, loans,
 *    schedules, transactions, KYC, …) are re-keyed to the canonical Mongo id.
 *  - Every other row is upserted by its existing id (no ids are regenerated).
 *  - Existing Mongo fields that the Supabase row lacks are preserved (merge, not
 *    replace), so Mongo-only state (e.g. emiPlanDraft, autopay mandates) survives.
 *
 * Never deletes anything. Re-runnable.
 *
 * Usage:  node scripts/migrate-mongo/sync-current.js
 * Env:    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (read), MONGODB_URI (write)
 */
require('dotenv').config();
const dns = require('dns');
// Local/dev only — some ISP resolvers fail Atlas SRV lookups (same as mongo.ts).
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { createClient } = require('@supabase/supabase-js');
const { MongoClient } = require('mongodb');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI missing — add it to backend/.env first.');
  process.exit(1);
}

/** Collections that exist only in Mongo (auth internals) — never sourced from Supabase. */
const MONGO_ONLY = new Set(['roles', 'otps', 'refresh_tokens', 'checkoutSession']);

const USER_SCOPED_KEYS = ['userId', 'profileId', 'user_id', 'profile_id'];

async function fetchSupabaseTable(table) {
  let all = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data || []);
    if (!data || data.length < page) break;
    from += page;
  }
  return all;
}

function canonicalId(row) {
  return String(row.id ?? row._id ?? '');
}

function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '').slice(-10);
}

async function main() {
  // 1) Discover the live Supabase tables.
  const spec = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: 'application/openapi+json',
    },
  }).then((r) => r.json());
  const tables = Object.keys(spec.paths || {})
    .map((p) => p.replace(/^\//, ''))
    .filter((t) => !MONGO_ONLY.has(t))
    .sort();

  const mongo = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB_NAME || 'loanex');
  const stats = { inserted: 0, updated: 0, skipped: 0, failed: 0, rekeyed: 0 };
  const failures = [];

  const upsert = async (collection, row) => {
    const id = canonicalId(row);
    if (!id) {
      stats.skipped += 1;
      return;
    }
    const doc = { ...row, id };
    delete doc._id;
    try {
      const res = await db.collection(collection).updateOne(
        { _id: id },
        { $set: doc, $setOnInsert: { _id: id } },
        { upsert: true },
      );
      if (res.upsertedCount > 0) stats.inserted += 1;
      else if (res.modifiedCount > 0) stats.updated += 1;
    } catch (e) {
      stats.failed += 1;
      failures.push(`${collection}/${id}: ${e.message}`);
    }
  };

  // 2) Users first: build phone/email → canonical Mongo id map.
  console.log('— Indexing existing MongoDB users …');
  const mongoUsers = await db.collection('users').find({}).toArray();
  const phoneToMongoId = new Map();
  const emailToMongoId = new Map();
  for (const u of mongoUsers) {
    const mid = String(u._id ?? u.id ?? '');
    const phone = normalizePhone(u.phone);
    if (phone && phone.length === 10 && !phoneToMongoId.has(phone)) phoneToMongoId.set(phone, mid);
    const email = String(u.email ?? '').toLowerCase().trim();
    if (email && !emailToMongoId.has(email)) emailToMongoId.set(email, mid);
  }

  const remapId = (value) => {
    if (value === null || value === undefined) return value;
    const key = String(value);
    return phoneToMongoId.get(key) || emailToMongoId.get(key) || key;
  };

  console.log('— Syncing users (Supabase → Mongo) …');
  const sbUsers = await fetchSupabaseTable('users');
  for (const u of sbUsers) {
    const phone = normalizePhone(u.phone);
    const email = String(u.email ?? '').toLowerCase().trim();
    const existing = (phone && phoneToMongoId.get(phone)) || (email && emailToMongoId.get(email));
    if (existing) {
      // Identity already exists in Mongo — map the Supabase id to it instead of duplicating.
      if (u.id && u.id !== existing) {
        phoneToMongoId.set(u.id, existing);
        emailToMongoId.set(u.id, existing);
        stats.rekeyed += 1;
      }
      stats.skipped += 1;
      continue;
    }
    await upsert('users', u);
    if (u.id) {
      phoneToMongoId.set(u.id, u.id);
      if (phone) phoneToMongoId.set(phone, u.id);
      if (email) emailToMongoId.set(email, u.id);
    }
  }

  // 3) Profiles (keyed by user id — re-key to canonical Mongo identity).
  console.log('— Syncing profiles …');
  const sbProfiles = await fetchSupabaseTable('profiles');
  for (const p of sbProfiles) {
    const mappedId = remapId(p.id);
    const mappedUserId = remapId(p.userId ?? p.id);
    if (mappedId !== String(p.id)) stats.rekeyed += 1;
    const doc = { ...p, id: mappedId, userId: mappedUserId };
    delete doc._id;
    try {
      await db.collection('profiles').updateOne(
        { _id: mappedId },
        { $set: doc, $setOnInsert: { _id: mappedId } },
        { upsert: true },
      );
    } catch (e) {
      stats.failed += 1;
      failures.push(`profiles/${mappedId}: ${e.message}`);
    }
  }

  // 4) Everything else.
  const SKIP_TABLES = new Set(['users', 'profiles']);
  for (const table of tables) {
    if (SKIP_TABLES.has(table)) continue;
    let rows;
    try {
      rows = await fetchSupabaseTable(table);
    } catch (e) {
      failures.push(`${table}: ${e.message}`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`— ${table}: 0 rows (skip)`);
      continue;
    }
    let rekeyed = 0;
    for (const row of rows) {
      let doc = row;
      const touched = USER_SCOPED_KEYS.some((k) => row[k] !== undefined && row[k] !== null);
      if (touched) {
        doc = { ...row };
        for (const k of USER_SCOPED_KEYS) {
          if (doc[k] !== undefined && doc[k] !== null) {
            const mapped = remapId(doc[k]);
            if (mapped !== doc[k]) {
              doc[k] = mapped;
              rekeyed += 1;
            }
          }
        }
      }
      await upsert(table, doc);
    }
    stats.rekeyed += rekeyed;
    console.log(`— ${table}: ${rows.length} rows synced`);
  }

  await mongo.close();

  console.log('\n===== SYNC SUMMARY =====');
  console.log(JSON.stringify(stats, null, 2));
  if (failures.length) {
    console.log('\n===== FAILURES =====');
    for (const f of failures) console.log(' •', f);
  }
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('SYNC ABORTED:', e.message);
  process.exit(1);
});
