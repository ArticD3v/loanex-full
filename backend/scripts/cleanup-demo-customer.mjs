#!/usr/bin/env node
/**
 * LoanEx — cleanup of the old demo customer (phone 9462557060 /
 * gourimusharraf@gmail.com) from local json-db persistence AND/OR Supabase.
 *
 * Usage (run from backend/):
 *   node scripts/cleanup-demo-customer.mjs              # dry-run (prints only)
 *   node scripts/cleanup-demo-customer.mjs --apply      # write db.json changes
 *   node scripts/cleanup-demo-customer.mjs --apply --supabase
 *                                                     # + run SQL vs DATABASE_URL
 *
 * SAFETY:
 *   - Matches ONLY the demo identity (normalized phone / email).
 *   - db.json: removes the demo rows from users/profiles/customer_kyc and any
 *     child rows in other collections referencing the removed ids (matching the
 *     ON DELETE CASCADE behaviour of Postgres). Prints every removal.
 *   - Supabase: executes cleanup-demo-customer.sql against DATABASE_URL
 *     (loaded from .env or the shell). The SQL previews AND deletes in a single
 *     transaction — it is DESTRUCTIVE — so it requires --apply too. It fails
 *     closed: if any child FK were NO ACTION/RESTRICT instead of CASCADE, the
 *     users delete aborts and the whole transaction rolls back.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');
const SQL_FILE = path.join(__dirname, '..', 'cleanup-demo-customer.sql');

const PHONE = '9462557060';
const EMAIL = 'gourimusharraf@gmail.com';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const SUPABASE = args.has('--supabase');

if (SUPABASE && !APPLY) {
  console.error(
    '[supabase] Refusing to run the SQL in dry-run mode: the script is destructive.\n' +
    '[supabase] Pass --apply together with --supabase to execute it.',
  );
  process.exit(2);
}

const norm = (v) => String(v ?? '').trim().toLowerCase();

function isDemoIdentity(row) {
  return (
    norm(row?.phone) === PHONE ||
    norm(row?.mobile_number) === PHONE ||
    norm(row?.email) === EMAIL ||
    norm(row?.mobile) === PHONE
  );
}

/** Collections whose rows reference a user/profile by these FK-ish keys. */
const FK_KEYS = ['userId', 'profileId', 'customerId', 'user_id', 'profile_id'];

function cleanJsonDb() {
  if (!existsSync(DB_FILE)) {
    console.log(`[json-db] no db.json at ${DB_FILE} — nothing to clean.`);
    return;
  }

  const db = JSON.parse(readFileSync(DB_FILE, 'utf8'));
  let removedTotal = 0;
  const removedIds = new Set();

  // 1) Direct demo rows in users / profiles (these carry the PII we match on).
  for (const collection of ['users', 'profiles']) {
    const rows = Array.isArray(db[collection]) ? db[collection] : [];
    const keep = rows.filter((row) => {
      if (!isDemoIdentity(row)) return true;
      console.log(`[json-db] remove ${collection}.${row?.id} (${row?.phone ?? row?.mobile_number ?? row?.email ?? '?'})`);
      if (row?.id) removedIds.add(row.id);
      removedTotal++;
      return false;
    });
    if (keep.length !== rows.length) db[collection] = keep;
  }

  // 2) customer_kyc rows carry no PII — match them by the removed user/profile
  //    ids (userId / profileId), falling back to any direct PII if present.
  {
    const rows = Array.isArray(db.customer_kyc) ? db.customer_kyc : [];
    const keep = rows.filter((row) => {
      const referenced =
        removedIds.has(row?.userId) ||
        removedIds.has(row?.profileId) ||
        isDemoIdentity(row);
      if (!referenced) return true;
      console.log(`[json-db] remove customer_kyc.${row?.id} (references removed demo row)`);
      if (row?.id) removedIds.add(row.id);
      removedTotal++;
      return false;
    });
    if (keep.length !== rows.length) db.customer_kyc = keep;
  }

  // 3) Cascade: child rows in every other collection referencing removed ids
  //    (orders, cart_items, wishlist_items, addresses, notifications, emi_*,
  //    reviews, digilocker/experian reports, ...).
  for (const [collection, rows] of Object.entries(db)) {
    if (!Array.isArray(rows) || ['users', 'profiles', 'customer_kyc'].includes(collection)) {
      continue;
    }
    const keep = rows.filter((row) => {
      const referenced = FK_KEYS.some((key) => removedIds.has(row?.[key]));
      if (referenced) {
        console.log(`[json-db] remove ${collection}.${row?.id} (references removed demo row)`);
        removedTotal++;
      }
      return !referenced;
    });
    if (keep.length !== rows.length) db[collection] = keep;
  }

  console.log(`[json-db] total rows removed: ${removedTotal}`);

  if (removedTotal > 0 && APPLY) {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    console.log('[json-db] db.json updated.');
  } else if (removedTotal > 0) {
    console.log('[json-db] dry-run — pass --apply to write changes.');
  }
}

async function cleanSupabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for --supabase (set it in .env or the shell).');
  }
  if (!existsSync(SQL_FILE)) {
    throw new Error(`SQL file not found: ${SQL_FILE}`);
  }
  const sql = readFileSync(SQL_FILE, 'utf8');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
  try {
    // The SQL wraps itself in BEGIN/COMMIT and prints NOTICE previews.
    await pool.query(sql);
    console.log('[supabase] cleanup-demo-customer.sql executed (see NOTICE output above).');
  } finally {
    await pool.end();
  }
}

(async () => {
  cleanJsonDb();
  if (SUPABASE) {
    await cleanSupabase().catch((err) => {
      console.error('[supabase] failed:', err.message);
      process.exitCode = 1;
    });
  } else {
    console.log('Tip: add --supabase to also run the SQL against DATABASE_URL.');
  }
})();
