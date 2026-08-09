const fs = require("fs");
const path = require("path");
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[key] = val.replace(/\\n/g, "\n");
  }
  return env;
}
function describe(env, key) {
  const v = (env && env[key]) || "";
  const present = Boolean(v);
  let kind = "missing";
  if (present) {
    if (/^mongodb(\+srv)?:\/\//i.test(v)) kind = "mongodb";
    else if (/^https?:\/\//i.test(v)) kind = "http";
    else kind = "set";
  }
  const looksRedacted = /sensitive|redacted|^\*{3,}$|^\[.*\]$/i.test(v) && v.length < 40;
  return { key, present, length: v.length, kind, looksRedacted };
}
const files = [
  "backend/.env.decrypted",
  "backend/.env.local.bak",
  "backend/.env.runtime",
  "customer-web/.env.local",
];
// Mongo is the single source of truth — Supabase/postgres env vars were retired.
const keys = ["MONGODB_URI", "MONGODB_DB_NAME"];
const out = [];
for (const f of files) {
  const env = loadEnvFile(f);
  out.push({
    file: f,
    exists: !!env,
    keyCount: env ? Object.keys(env).length : 0,
    hasMongoUriKey: !!(env && Object.prototype.hasOwnProperty.call(env, "MONGODB_URI")),
    keys: keys.map((k) => describe(env, k)),
    mongoKeysSample: env ? Object.keys(env).filter((k) => /MONGO/i.test(k)) : [],
  });
}
console.log(JSON.stringify(out, null, 2));
