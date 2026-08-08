const fs = require("fs");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

function extractPgFromTestDb() {
  const t = fs.readFileSync("C:/Users/user/Desktop/loanex-full/backend/test-db.js", "utf8");
  const m = t.match(/connectionString:\s*'([^']+)'/);
  if (!m) throw new Error("PG connectionString not found in test-db.js");
  return m[1];
}
function extractSupabaseFromSeed() {
  const t = fs.readFileSync("C:/Users/user/Desktop/loanex-full/apps/customer-mobile/seed.js", "utf8");
  const url = (t.match(/supabaseUrl\s*=\s*'([^']+)'/) || [])[1];
  const key = (t.match(/supabaseKey\s*=\s*'([^']+)'/) || [])[1];
  if (!url || !key) throw new Error("Supabase credentials not found in seed.js");
  return { url, key };
}

(async () => {
  const out = { postgres: {}, supabase: {}, mongodb: { presentInProject: false } };

  // Postgres read-only probe
  try {
    const connectionString = extractPgFromTestDb();
    out.postgres.source = "backend/test-db.js";
    out.postgres.uriKind = /^postgres/i.test(connectionString) ? "postgres" : "other";
    out.postgres.uriLength = connectionString.length;
    const client = new Client({ connectionString, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const now = await client.query("select now() as n");
    const tables = await client.query(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema in ('public','auth') and table_type='BASE TABLE'
      order by table_schema, table_name
    `);
    out.postgres.ok = true;
    out.postgres.serverTime = now.rows[0].n;
    out.postgres.tableCount = tables.rows.length;
    out.postgres.tables = tables.rows.map((r) => r.table_schema + "." + r.table_name);
    await client.end();
  } catch (e) {
    out.postgres.ok = false;
    out.postgres.error = e.message;
  }

  // Supabase read-only probe
  try {
    const { url, key } = extractSupabaseFromSeed();
    out.supabase.source = "apps/customer-mobile/seed.js";
    out.supabase.urlHost = new URL(url).host;
    out.supabase.keyLen = key.length;
    out.supabase.keyRole = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const sample = ["users", "products", "orders", "paymentTransaction", "emi_applications", "loanAccount", "roles"];
    out.supabase.counts = {};
    for (const table of sample) {
      const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
      out.supabase.counts[table] = error ? { error: error.message, code: error.code } : { count };
    }
    out.supabase.ok = true;
  } catch (e) {
    out.supabase.ok = false;
    out.supabase.error = e.message;
  }

  console.log(JSON.stringify(out, null, 2));
})();
