const fs = require("fs");
const path = require("path");
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val.replace(/\\n/g, "\n");
  }
  return env;
}
const root = path.join(__dirname, "..", "..");
const files = [".env", ".env.runtime", ".env.local"].map((f) => path.join(root, f));
const env = {};
for (const f of files) Object.assign(env, loadEnvFile(f));
Object.assign(env, process.env);
function describe(key) {
  const v = env[key] || "";
  const present = Boolean(v);
  let kind = "missing";
  if (present) {
    if (/^mongodb(\+srv)?:\/\//i.test(v)) kind = "mongodb";
    else if (/^https?:\/\//i.test(v)) kind = "http";
    else kind = "set";
  }
  const looksRedacted = /sensitive|redacted/i.test(v) && v.length < 40;
  return { key, present, length: v.length, kind, looksRedacted };
}
// Mongo is the single source of truth — Supabase/postgres env vars were retired.
const keys = ["MONGODB_URI", "MONGODB_DB_NAME"];
console.log(
  JSON.stringify(
    {
      envFiles: files.map((f) => ({ name: path.basename(f), exists: fs.existsSync(f) })),
      keys: keys.map(describe),
    },
    null,
    2
  )
);
