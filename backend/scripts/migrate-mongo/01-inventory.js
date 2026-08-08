const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(p) {
  const env = {};
  if (!fs.existsSync(p)) return env;
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

const env = loadEnv("C:/Users/user/Desktop/loanex-full/backend/.env");
let url = env.SUPABASE_URL;
let key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || /sensitive/i.test(url) || url.length < 20) {
  const seed = fs.readFileSync("C:/Users/user/Desktop/loanex-full/apps/customer-mobile/seed.js", "utf8");
  url = seed.match(/supabaseUrl\s*=\s*'([^']+)'/)[1];
  key = seed.match(/supabaseKey\s*=\s*'([^']+)'/)[1];
}

const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  const res = await fetch(url + "/rest/v1/", { headers: { apikey: key, Authorization: "Bearer " + key } });
  const openapi = await res.json();
  let tables = Object.keys(openapi.paths || {}).map((p) => p.replace(/^\//, "")).filter(Boolean);
  tables = [...new Set(tables)].sort();

  // Also probe known runtime-only names
  const extra = [
    "roles","job_openings","job_applications","general_applications","paymentTransaction",
    "loanAccount","loan_accounts","emi_schedules","orderTracking","fi_cases","branches",
    "pincodes","wholesalers","delivery_partners","delivery_zones","product_emi_plans",
    "notification","supportTicket","checkoutSession","customerVerification","panVerification",
    "aadhaarVerification","bankVerification","mobileVerification","userAddress","autopayMandate",
  ];
  for (const t of extra) if (!tables.includes(t)) tables.push(t);
  tables = [...new Set(tables)].sort();

  const inventory = {};
  for (const table of tables) {
    const head = await sb.from(table).select("*", { count: "exact", head: true });
    if (head.error) {
      inventory[table] = { exists: false, error: head.error.message, code: head.error.code };
      continue;
    }
    const sample = await sb.from(table).select("*").limit(3);
    const cols = sample.data && sample.data[0] ? Object.keys(sample.data[0]).sort() : [];
    const ids = (sample.data || []).map((r) => r.id).filter(Boolean);
    inventory[table] = {
      exists: true,
      count: head.count ?? 0,
      columns: cols,
      sampleIds: ids,
      sampleKeys: cols,
    };
  }

  const outDir = "C:/Users/user/Desktop/loanex-full/backend/scripts/migrate-mongo/reports";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "inventory.json"), JSON.stringify({ tableCount: tables.length, inventory }, null, 2));
  const summary = Object.entries(inventory).map(([name, info]) => ({
    name,
    exists: info.exists,
    count: info.count ?? null,
    cols: info.columns ? info.columns.length : 0,
    error: info.error || null,
  }));
  console.log(JSON.stringify({ tableCount: tables.length, existing: summary.filter(s => s.exists).length, missing: summary.filter(s => !s.exists).length, summary }, null, 2));
})();
