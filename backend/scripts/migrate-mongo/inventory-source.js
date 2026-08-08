const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const t = fs.readFileSync("C:/Users/user/Desktop/loanex-full/apps/customer-mobile/seed.js", "utf8");
const url = t.match(/supabaseUrl\s*=\s*'([^']+)'/)[1];
const key = t.match(/supabaseKey\s*=\s*'([^']+)'/)[1];
const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  // Discover tables via OpenAPI
  const res = await fetch(url + "/rest/v1/", {
    headers: { apikey: key, Authorization: "Bearer " + key },
  });
  const text = await res.text();
  let paths = [];
  try {
    const j = JSON.parse(text);
    paths = Object.keys(j.paths || {}).map((p) => p.replace(/^\//, "")).filter(Boolean);
  } catch {
    paths = [];
  }
  paths = [...new Set(paths)].sort();

  const counts = {};
  for (const table of paths) {
    const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
    counts[table] = error ? { error: error.message, code: error.code } : count;
  }

  // Fix PG host attempts without printing password
  const pgLine = fs.readFileSync("C:/Users/user/Desktop/loanex-full/backend/test-db.js", "utf8").match(/connectionString:\s*'([^']+)'/)[1];
  const u = new URL(pgLine);
  const hosts = [
    u.hostname,
    "aws-0-ap-south-1.pooler.supabase.com",
    "aws-0-ap-southeast-1.pooler.supabase.com",
    "db." + "sfddelyotptsfbigwllg" + ".supabase.co",
  ];
  const pgAttempts = [];
  const { Client } = require("pg");
  for (const host of hosts) {
    const cs = pgLine.replace(u.hostname, host);
    const client = new Client({ connectionString: cs, connectionTimeoutMillis: 8000, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const r = await client.query("select current_database() as d, current_user as u");
      pgAttempts.push({ host, ok: true, db: r.rows[0].d, user: r.rows[0].u });
      await client.end();
      break;
    } catch (e) {
      pgAttempts.push({ host, ok: false, error: e.message });
    }
  }

  console.log(JSON.stringify({ tableCount: paths.length, tables: paths, counts, pgAttempts }, null, 2));
})();
