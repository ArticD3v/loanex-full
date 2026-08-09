const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { createClient } = require("@supabase/supabase-js");
const { MongoClient } = require("mongodb");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
// Resolve paths relative to this repo (backend/scripts/migrate-mongo → backend).
const BACKEND = path.resolve(__dirname, "..", "..");
const ROOT = path.resolve(BACKEND, "..");

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
function snakeToCamel(key) { return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function normalizeDoc(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    const camel = snakeToCamel(k);
    out[camel] = v;
    if (camel !== k) out[k] = v;
  }
  if (out.userId == null && out.user_id != null) out.userId = out.user_id;
  if (out.createdAt == null && out.created_at != null) out.createdAt = out.created_at;
  // Strip null unique-index fields so sparse unique works
  for (const f of ["slug", "sku", "orderNumber", "applicationNumber", "loanAccountNumber", "razorpayOrderId", "email", "phone", "name", "token"]) {
    if (out[f] == null) delete out[f];
  }
  return out;
}

(async () => {
  const env = loadEnv(path.join(BACKEND, ".env"));
  let sbUrl = env.SUPABASE_URL, sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || /sensitive/i.test(sbUrl)) {
    const seed = fs.readFileSync(path.join(ROOT, "apps/customer-mobile/seed.js"), "utf8");
    sbUrl = seed.match(/supabaseUrl\s*=\s*'([^']+)'/)[1];
    sbKey = seed.match(/supabaseKey\s*=\s*'([^']+)'/)[1];
  }
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME || "loanex");

  // --- Identity reconciliation (same rule as 02-migrate / sync-current) ---------
  // Existing Mongo users stay canonical by phone/email; child rows are re-keyed.
  const phoneToMongoId = new Map();
  const emailToMongoId = new Map();
  const existingUsers = await db.collection("users").find({}).toArray();
  for (const u of existingUsers) {
    const mid = String(u._id ?? u.id ?? "");
    const phone = String(u.phone ?? "").replace(/\D/g, "").slice(-10);
    if (phone.length === 10 && !phoneToMongoId.has(phone)) phoneToMongoId.set(phone, mid);
    const email = String(u.email ?? "").toLowerCase().trim();
    if (email && !emailToMongoId.has(email)) emailToMongoId.set(email, mid);
  }
  const remapId = (v) => {
    if (v === null || v === undefined) return v;
    const key = String(v);
    return phoneToMongoId.get(key) || emailToMongoId.get(key) || key;
  };

  // Recreate unique indexes with partialFilterExpression (not just sparse)
  async function recreatePartialUnique(colName, field) {
    const col = db.collection(colName);
    try { await col.dropIndex(field + "_1"); } catch {}
    await col.createIndex(
      { [field]: 1 },
      { unique: true, partialFilterExpression: { [field]: { $type: "string" } }, name: field + "_1" }
    );
  }
  await recreatePartialUnique("products", "slug");
  await recreatePartialUnique("products", "sku");
  await recreatePartialUnique("orders", "orderNumber");

  async function upsertTable(mongoName, table) {
    const { data, error } = await sb.from(table).select("*").limit(10000);
    if (error) throw new Error(table + ": " + error.message);
    let ok = 0, fail = 0;
    for (const row of data || []) {
      const n = normalizeDoc(row);
      for (const k of ["userId", "profileId", "user_id", "profile_id"]) {
        if (n[k] !== null && n[k] !== undefined) n[k] = remapId(n[k]);
      }
      const id = String(n.id);
      n.id = id; n._id = id;
      try {
        await db.collection(mongoName).replaceOne({ _id: id }, n, { upsert: true });
        ok++;
      } catch (e) {
        fail++;
        console.log(JSON.stringify({ mongoName, id, error: e.message }));
      }
    }
    const count = await db.collection(mongoName).countDocuments();
    return { mongoName, source: (data || []).length, ok, fail, count };
  }

  const products = await upsertTable("products", "products");
  const orders = await upsertTable("orders", "orders");
  console.log(JSON.stringify({ products, orders }, null, 2));
  await client.close();
})().catch((e) => { console.error(JSON.stringify({ ok:false, error:e.message })); process.exit(1); });
