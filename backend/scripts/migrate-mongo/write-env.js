const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const envPath = path.join(root, ".env");
const gitignorePath = path.join(root, ".gitignore");

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

function quoteIfNeeded(val) {
  if (/[\s#"']/.test(val) || val.includes("=")) {
    return JSON.stringify(val);
  }
  return val;
}

const existed = fs.existsSync(envPath);
const base = loadEnvFile(envPath);
const fromRuntime = loadEnvFile(path.join(root, ".env.runtime"));
const fromVercel = loadEnvFile(path.join(root, ".env.from-vercel"));
const merged = { ...fromRuntime, ...fromVercel, ...base };

// Prefer explicit env / existing .env — never hardcode credentials in source.
if (process.env.MONGODB_URI) merged.MONGODB_URI = process.env.MONGODB_URI;
if (process.env.MONGODB_DB_NAME) merged.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
if (!merged.MONGODB_DB_NAME) merged.MONGODB_DB_NAME = "loanex";
if (!merged.MONGODB_URI) {
  console.error(
    "MONGODB_URI missing. Set it in the environment or backend/.env before running write-env.js.",
  );
  process.exit(1);
}

delete merged.VERCEL_OIDC_TOKEN;
delete merged.VERCEL_ENV;
delete merged.VERCEL_URL;
delete merged.VERCEL_GIT_COMMIT_SHA;

const lines = Object.keys(merged)
  .sort()
  .map((k) => `${k}=${quoteIfNeeded(String(merged[k] ?? ""))}`);
fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");

let gi = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
const needed = [".env", ".env.local", ".env.*.local", ".env.from-vercel", ".env.vercel-pull"];
let giChanged = false;
for (const n of needed) {
  if (!gi.split(/\r?\n/).includes(n)) {
    gi += (gi.endsWith("\n") || gi.length === 0 ? "" : "\n") + n + "\n";
    giChanged = true;
  }
}
if (giChanged) fs.writeFileSync(gitignorePath, gi, "utf8");

const { execSync } = require("child_process");
let ignored = false;
try {
  const out = execSync("git check-ignore -v backend/.env", {
    cwd: path.join(root, ".."),
    encoding: "utf8",
  });
  ignored = Boolean(out && out.trim());
} catch {
  ignored = false;
}

console.log(
  JSON.stringify(
    {
      backendEnv: existed ? "UPDATED" : "CREATED",
      envExists: fs.existsSync(envPath),
      hasMongoUriKey: Object.prototype.hasOwnProperty.call(merged, "MONGODB_URI"),
      hasMongoDbName: merged.MONGODB_DB_NAME === "loanex",
      preservedDatabaseUrl: Object.prototype.hasOwnProperty.call(merged, "DATABASE_URL"),
      preservedSupabaseUrl: Object.prototype.hasOwnProperty.call(merged, "SUPABASE_URL"),
      preservedSupabaseKey: Object.prototype.hasOwnProperty.call(
        merged,
        "SUPABASE_SERVICE_ROLE_KEY"
      ),
      gitignoreUpdated: giChanged,
      envGitIgnored: ignored,
      keyCount: Object.keys(merged).length,
    },
    null,
    2
  )
);
