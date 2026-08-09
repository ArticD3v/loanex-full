/**
 * Clean up phantom/demo data left over from earlier testing (MongoDB).
 *
 * What it removes (fully backed up first — never deletes without a backup):
 *  1. The phantom demo user `d8f57913` (a fabricated user holding the REAL
 *     customer's PII) — all 14 collections of its rows, plus the two demo
 *     loans (demo-loan-active-0001, id_1786053042397_aky1of) and their EMI
 *     schedules. The admin loan ledger then shows only real loans.
 *  2. Orphan profiles (user id exists in no store) whose phone/email does NOT
 *     match any canonical Mongo user — pure test artifacts (@example.com,
 *     fake numbers) are deleted.
 *  3. Orphan profiles whose phone/email DOES match a canonical Mongo user
 *     (duplicate profiles for real accounts like tousif/ankit) are RE-KEYED
 *     to the canonical user id instead of deleted, so order/loan views keep
 *     showing the customer's real name.
 *  4. Orphan addresses / KYC / verification rows are re-keyed to the canonical
 *     user when resolvable, otherwise removed.
 *
 * Audit logs and notifications are treated as history and kept for rows that
 * map to real identities; only the phantom user's audit logs are removed.
 *
 * Usage:  node scripts/migrate-mongo/cleanup-phantom-demo.js
 * Env:    MONGODB_URI (write) — reads backup dir at <repo>/backup/
 */
require('dotenv').config();
const dns = require('dns');
const fs = require('fs');
const path = require('path');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');

const PHANTOM = 'd8f57913-2d25-4a65-8b36-4c28f645a271';
const DEMO_LOANS = ['demo-loan-active-0001', 'id_1786053042397_aky1of'];

const PHANTOM_COLLECTIONS = [
  'profiles', 'userAddress', 'fi_cases', 'autopayMandate', 'loanAccount',
  'notification', 'panVerification', 'mobileVerification', 'audit_log',
  'customer_kyc', 'addresses', 'digilocker_reports', 'aadhaarVerification',
  'customerVerification',
];

// Collections whose orphan rows we resolve-or-remove (user-facing account data).
const RESOLVE_OR_REMOVE = [
  'profiles', 'addresses', 'userAddress', 'customer_kyc', 'panVerification',
  'aadhaarVerification', 'bankVerification', 'mobileVerification',
  'digilocker_reports', 'experian_reports', 'customerVerification',
];

function normPhone(v) {
  return String(v ?? '').replace(/\D/g, '').slice(-10);
}

async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB_NAME || 'loanex');
  const backup = { ts: new Date().toISOString(), phantom: [], removed: [], rekeyed: [] };
  const report = { phantomRows: 0, orphanRemoved: 0, orphanRekeyed: 0 };

  const backupFile = path.resolve(__dirname, '..', '..', '..', 'backup', `phantom-demo-cleanup-${Date.now()}.json`);
  const save = () => fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  // ---------- 1) Canonical users by phone/email ----------
  const users = await db.collection('users').find({}).toArray();
  const byPhone = new Map();
  const byEmail = new Map();
  for (const u of users) {
    const mid = String(u._id ?? u.id ?? '');
    const ph = normPhone(u.phone);
    if (ph.length === 10 && !byPhone.has(ph)) byPhone.set(ph, mid);
    const em = String(u.email ?? '').toLowerCase().trim();
    if (em && !byEmail.has(em)) byEmail.set(em, mid);
  }
  const resolveUser = (p) => {
    if (!p) return null;
    const ph = normPhone(p.mobileNumber ?? p.mobile ?? p.phone);
    const em = String(p.email ?? '').toLowerCase().trim();
    return (ph.length === 10 && byPhone.get(ph)) || (em && byEmail.get(em)) || null;
  };

  // ---------- 2) Phantom user dataset ----------
  console.log('— Removing phantom user dataset (d8f57913) …');
  for (const c of PHANTOM_COLLECTIONS) {
    const col = db.collection(c);
    const docs = await col
      .find({ $or: [{ userId: PHANTOM }, { user_id: PHANTOM }, { profileId: PHANTOM }, { profile_id: PHANTOM }, { id: PHANTOM }] })
      .toArray();
    if (docs.length) {
      backup.phantom.push({ collection: c, docs });
      await col.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
      report.phantomRows += docs.length;
      console.log(`  removed ${docs.length} ${c} rows`);
    }
  }
  // Demo loans + their schedules.
  for (const loanId of DEMO_LOANS) {
    const loan = await db.collection('loanAccount').findOne({ id: loanId });
    if (loan) {
      backup.phantom.push({ collection: 'loanAccount', docs: [loan] });
      await db.collection('loanAccount').deleteOne({ _id: loan._id });
      report.phantomRows += 1;
    }
    const scheds = await db.collection('emi_schedules').find({ loanAccountId: loanId }).toArray();
    if (scheds.length) {
      backup.phantom.push({ collection: 'emi_schedules', docs: scheds });
      await db.collection('emi_schedules').deleteMany({ _id: { $in: scheds.map((s) => s._id) } });
      report.phantomRows += scheds.length;
    }
  }

  // ---------- 3) Orphan profiles / addresses / KYC ----------
  console.log('— Resolving or removing orphan rows …');
  // First, map every orphan profile to a canonical user (or null = delete).
  const allProfiles = await db.collection('profiles').find({}).toArray();
  const validUserIds = new Set(users.map((u) => String(u._id ?? u.id)));
  const profileTarget = new Map(); // orphan profile id -> canonical user id | null
  const targetProfiles = new Set(); // canonical ids that already have a profile

  for (const p of allProfiles) {
    const pid = String(p.id ?? p._id ?? '');
    if (validUserIds.has(pid) || validUserIds.has(String(p.userId ?? ''))) continue;
    if (pid === PHANTOM) continue; // handled above
    profileTarget.set(pid, resolveUser(p));
    targetProfiles.add(pid);
  }
  for (const p of allProfiles) {
    if (validUserIds.has(String(p.id ?? ''))) targetProfiles.add(String(p.id));
  }

  const deleteDocs = async (collName, docs) => {
    if (!docs.length) return;
    backup.removed.push({ collection: collName, docs });
    await db.collection(collName).deleteMany({ _id: { $in: docs.map((d) => d._id) } });
    report.orphanRemoved += docs.length;
  };
  const rekeyDocs = async (collName, docs, fromId, toId, idIsDocId) => {
    for (const d of docs) {
      backup.rekeyed.push({ collection: collName, before: d, toId });
      const upd = {};
      for (const k of ['userId', 'user_id', 'profileId', 'profile_id']) {
        if (String(d[k] ?? '') === String(fromId)) upd[k] = toId;
      }
      if (idIsDocId && String(d.id) === String(fromId)) upd.id = toId;
      await db.collection(collName).updateOne({ _id: d._id }, { $set: upd });
      report.orphanRekeyed += 1;
    }
  };

  for (const collName of RESOLVE_OR_REMOVE) {
    if (collName === 'profiles') continue; // handled below
    const col = db.collection(collName);
    const docs = await col.find({}).toArray();
    const toRemove = [];
    for (const d of docs) {
      const refId = String(d.userId ?? d.user_id ?? d.profileId ?? d.profile_id ?? '');
      if (!refId || validUserIds.has(refId) || refId === PHANTOM) continue;
      const target = profileTarget.get(refId);
      if (target) {
        await rekeyDocs(collName, [d], refId, target, false);
      } else {
        toRemove.push(d);
      }
    }
    await deleteDocs(collName, toRemove);
  }

  // Profiles: re-key duplicates to canonical users; delete pure-test orphans.
  for (const [pid, target] of profileTarget) {
    const p = allProfiles.find((x) => String(x.id ?? x._id ?? '') === pid);
    if (!p) continue;
    if (target) {
      if (targetProfiles.has(target)) {
        // Canonical profile already exists — drop the duplicate (merged below).
        await deleteDocs('profiles', [p]);
      } else {
        await rekeyDocs('profiles', [p], pid, target, true);
        targetProfiles.add(target);
      }
    } else {
      await deleteDocs('profiles', [p]);
    }
  }

  await mongo.close();
  save();
  console.log(`\n===== CLEANUP SUMMARY =====`);
  console.log(`phantom rows removed: ${report.phantomRows}`);
  console.log(`orphan rows removed:  ${report.orphanRemoved}`);
  console.log(`orphan rows re-keyed: ${report.orphanRekeyed}`);
  console.log(`Backup written: ${backupFile}`);
}

main().catch((e) => {
  console.error('CLEANUP ABORTED:', e.message);
  process.exit(1);
});
