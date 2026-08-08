const fs = require("fs");
const dns = require("dns");
const { createClient } = require("@supabase/supabase-js");
const { MongoClient } = require("mongodb");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

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
  const env = loadEnv("C:/Users/user/Desktop/loanex-full/backend/.env");
  let sbUrl = env.SUPABASE_URL, sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || /sensitive/i.test(sbUrl)) {
    const seed = fs.readFileSync("C:/Users/user/Desktop/loanex-full/apps/customer-mobile/seed.js", "utf8");
    sbUrl = seed.match(/supabaseUrl\s*=\s*'([^']+)'/)[1];
    sbKey = seed.match(/supabaseKey\s*=\s*'([^']+)'/)[1];
  }
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME || "loanex");

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
