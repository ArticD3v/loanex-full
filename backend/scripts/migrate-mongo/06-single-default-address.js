// Migration 06 — Single default address per user.
//
// Legacy seed/import data marked `is_default: true` (and sometimes the
// pre-Mongo camelCase `isDefault` field) on EVERY address row, so the UI
// showed multiple "Default" badges and checkout picked an arbitrary default.
//
// This migration un-marks all but the newest *shipping* default per user:
//   - Among rows already marked default, prefer SHIPPING (label/addressType),
//     then pick the one with the newest createdAt (falling back to the
//     ObjectId timestamp for rows without createdAt).
//   - Unsets is_default on every other default row and drops the legacy
//     camelCase `isDefault` field everywhere, so the repository's
//     `is_default ?? isDefault` fallback can never resurrect a stale default.
//
// Run: node scripts/migrate-mongo/06-single-default-address.js
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { MongoClient } = require("mongodb");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

const BACKEND = path.resolve(__dirname, "..", "..");

function loadEnv(p) {
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}

function isShipping(row) {
  const label = String(row.label ?? row.addressType ?? "").toUpperCase();
  return label === "" || label === "SHIPPING" || label === "HOME";
}

function sortKey(row) {
  const t = new Date(row.createdAt ?? row.created_at ?? 0).getTime();
  if (Number.isFinite(t) && t > 0) return t;
  if (row._id && typeof row._id.getTimestamp === "function") {
    return row._id.getTimestamp().getTime();
  }
  return 0;
}

(async () => {
  const env = loadEnv(path.join(BACKEND, ".env"));
  const uri = env.MONGODB_URI || env.MONGO_URI;
  if (!uri) {
    console.error("MONGODB_URI is not configured in backend/.env");
    process.exit(1);
  }
  const dbName = env.MONGO_DB_NAME || "loanex";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000, family: 4 });
  await client.connect();
  const db = client.db(dbName);
  const addresses = db.collection("addresses");

  const all = await addresses.find({}).toArray();
  const byUser = new Map();
  for (const r of all) {
    const key = String(r.userId ?? r.profileId ?? r.user_id ?? r.profile_id ?? "");
    if (!key) continue;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(r);
  }

  let kept = 0;
  let cleared = 0;
  let legacyCleared = 0;
  let skippedUsers = 0;

  for (const [userId, rows] of byUser) {
    const defaults = rows
      .filter((r) => r.is_default === true || r.isDefault === true)
      .sort((a, b) => sortKey(b) - sortKey(a)); // newest first

    if (defaults.length === 0) {
      skippedUsers += 1;
      continue;
    }

    // Prefer a shipping default; otherwise keep the newest default of any type.
    const keep = defaults.find((r) => isShipping(r)) || defaults[0];
    kept += 1;

    for (const r of defaults) {
      if (String(r._id) === String(keep._id)) continue;
      await addresses.updateOne({ _id: r._id }, { $set: { is_default: false } });
      cleared += 1;
    }
  }

  // Drop the legacy camelCase field everywhere so it can never conflict with
  // (or resurrect via) the snake_case field in the repository fallback.
  const legacy = await addresses.updateMany(
    { isDefault: { $exists: true } },
    { $unset: { isDefault: "" } },
  );
  legacyCleared = legacy.modifiedCount ?? 0;

  console.log(`Addresses: kept ${kept} default(s) (one per user, newest shipping preferred).`);
  console.log(`Cleared ${cleared} duplicate default flag(s); removed legacy isDefault field on ${legacyCleared} row(s).`);
  console.log(`Skipped ${skippedUsers} user(s) with no default address.`);

  await client.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
