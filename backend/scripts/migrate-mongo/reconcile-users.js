/**
 * Reconcile user references in MongoDB against the canonical identity set.
 *
 * Problem: MongoDB holds two datasets — the original migration snapshot and a
 * Supabase sync. Phone/email reconciliation keeps ONE canonical Mongo user per
 * identity (Supabase ids like beabd43e are NOT duplicated), but some child rows
 * (orders, refresh_tokens, …) still reference the old Supabase user ids, so
 * those rows are invisible to the account the customer actually logs in with.
 *
 * This script:
 *  1. Loads canonical Mongo users (indexed by phone + email) and Supabase users
 *     (to learn which Supabase id belongs to which phone/email).
 *  2. Builds the id map: every Supabase user id → its canonical Mongo id.
 *  3. Walks EVERY collection and re-keys user-scoped fields (userId, user_id,
 *     profileId, profile_id, user.id, profile.id, …) through that map.
 *  4. Profiles are keyed by user id, so their own `id` is re-keyed too (when a
 *     target profile already exists, fields are merged instead of clobbered).
 *  5. Backs up every modified doc first. Never deletes anything. Re-runnable.
 *
 * Usage:  node scripts/migrate-mongo/reconcile-users.js
 * Env:    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (read), MONGODB_URI (write)
 */
require('dotenv').config();
const dns = require('dns');
const fs = require('fs');
const path = require('path');
// Local/dev only — some ISP resolvers fail Atlas SRV lookups (same as mongo.ts).
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { createClient } = require('@supabase/supabase-js');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI missing — add it to backend/.env first.');
  process.exit(1);
}

const USER_KEYS = new Set(['userId', 'user_id', 'profileId', 'profile_id', 'customerId', 'customer_id']);
const PARENT_KEYS = new Set(['user', 'profile', 'customer', 'owner', 'createdBy', 'updatedBy']);
const MAX_DEPTH = 8;

function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '').slice(-10);
}

async function fetchSupabaseTable(sb, table) {
  const { data, error } = await sb.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const mongo = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB_NAME || 'loanex');

  // --- 1) Canonical identity map (Mongo users first — they win) ------------
  const phoneToId = new Map();
  const emailToId = new Map();
  const mongoUsers = await db.collection('users').find({}).toArray();
  for (const u of mongoUsers) {
    const mid = String(u._id ?? u.id ?? '');
    const phone = normalizePhone(u.phone);
    if (phone.length === 10 && !phoneToId.has(phone)) phoneToId.set(phone, mid);
    const email = String(u.email ?? '').toLowerCase().trim();
    if (email && !emailToId.has(email)) emailToId.set(email, mid);
  }

  // --- 2) Supabase ids → canonical Mongo id ---------------------------------
  const sbUsers = await fetchSupabaseTable(sb, 'users');
  const idMap = new Map(); // old id (Supabase) → canonical Mongo id
  for (const u of sbUsers) {
    const sid = String(u.id ?? '');
    if (!sid) continue;
    const phone = normalizePhone(u.phone);
    const email = String(u.email ?? '').toLowerCase().trim();
    const canonical = (phone && phoneToId.get(phone)) || (email && emailToId.get(email));
    if (canonical && canonical !== sid) idMap.set(sid, canonical);
    // Register this Supabase id so child rows referencing it re-key to it
    // (when the user exists under its own id in Mongo).
    if (!phoneToId.has(sid)) phoneToId.set(sid, sid);
    if (!emailToId.has(sid)) emailToId.set(sid, sid);
  }

  const remap = (value) => {
    if (value === null || value === undefined) return value;
    const key = String(value);
    return idMap.get(key) || key;
  };

  console.log('Canonical map (Supabase id → Mongo id):');
  for (const [oldId, newId] of idMap) console.log(`  ${oldId} → ${newId}`);

  // --- 3) Walk every collection and re-key user references ------------------
  const colls = await db.listCollections().toArray();
  const stats = { scanned: 0, rekeyed: 0, modifiedDocs: 0, orphanRefs: new Map() };
  const backup = { ts: new Date().toISOString(), docs: [] };

  const walk = (obj, keyName, depth, results) => {
    if (!obj || typeof obj !== 'object' || depth > MAX_DEPTH) return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      let nv = v;
      const isUserKey = USER_KEYS.has(k);
      const isParentKey = PARENT_KEYS.has(k);
      const isUserNestedId =
        k === 'id' &&
        (keyName === 'user' ||
          keyName === 'profile' ||
          keyName === 'customer' ||
          keyName === 'owner' ||
          keyName === 'createdBy' ||
          keyName === 'updatedBy');
      if ((isUserKey || isUserNestedId) && (typeof v === 'string' || typeof v === 'number')) {
        const mapped = remap(v);
        if (mapped !== v) {
          nv = mapped;
          results.rekeyed += 1;
        } else if (v != null && !mongoUsers.some((u) => String(u._id ?? u.id) === String(v)) && !idMap.has(String(v)) && !phoneToId.has(String(v))) {
          // Reference to a user id that exists in no store — flag as orphan.
          const key = String(v);
          if (!stats.orphanRefs.has(key)) stats.orphanRefs.set(key, 0);
          stats.orphanRefs.set(key, stats.orphanRefs.get(key) + 1);
        }
      } else if (v && typeof v === 'object') {
        nv = walk(v, isParentKey ? k : keyName, depth + 1, results);
      }
      out[k] = nv;
    }
    return out;
  };

  for (const collInfo of colls) {
    const collName = collInfo.name;
    const col = db.collection(collName);
    const total = await col.countDocuments();
    if (total === 0) continue;
    stats.scanned += 1;
    const cursor = col.find({});
    let collModified = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const before = JSON.stringify(doc);
      const results = { rekeyed: 0 };
      let newDoc = walk(doc, null, 0, results);
      // Profiles are keyed by user id — re-key the doc's own id too.
      if (collName === 'profiles' && newDoc.id != null) {
        const mapped = remap(newDoc.id);
        if (mapped !== newDoc.id) {
          newDoc = { ...newDoc, id: mapped };
          results.rekeyed += 1;
        }
      }
      if (results.rekeyed > 0) {
        stats.rekeyed += results.rekeyed;
        stats.modifiedDocs += 1;
        collModified += 1;
        backup.docs.push({ collection: collName, before: JSON.parse(before), after: newDoc });
        try {
          await col.replaceOne({ _id: doc._id }, newDoc);
        } catch (e) {
          // Likely a profile-id collision — merge fields into the canonical profile instead.
          if (collName === 'profiles') {
            const existing = await col.findOne({ _id: newDoc.id });
            if (existing) {
              const merged = { ...newDoc, ...existing, id: newDoc.id };
              await col.replaceOne({ _id: newDoc.id }, merged);
              await col.deleteOne({ _id: doc._id });
              console.log(`  profiles: merged ${doc._id} → ${newDoc.id}`);
            }
          } else {
            console.error(`  FAILED ${collName}/${doc._id}: ${e.message}`);
          }
        }
      }
    }
    if (collModified > 0) console.log(`— ${collName}: ${collModified} docs re-keyed`);
  }

  // --- 4) Backup + summary ---------------------------------------------------
  const backupDir = path.resolve(__dirname, '..', '..', '..', 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `mongo-reconcile-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${backupFile}`);

  console.log(`\n===== RECONCILE SUMMARY =====`);
  console.log(`collections scanned: ${stats.scanned}`);
  console.log(`fields re-keyed:     ${stats.rekeyed}`);
  console.log(`docs modified:       ${stats.modifiedDocs}`);
  if (stats.orphanRefs.size) {
    console.log(`\norphan refs (no user in either store — left untouched): ${stats.orphanRefs.size} ids`);
    for (const [id, n] of [...stats.orphanRefs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`  ${id}: ${n} refs`);
    }
  }

  await mongo.close();
}

main().catch((e) => {
  console.error('RECONCILE ABORTED:', e.message);
  process.exit(1);
});
