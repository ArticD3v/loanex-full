const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
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

const envPath = "C:/Users/user/Desktop/loanex-full/backend/.env";
const env = { ...loadEnv(envPath), ...process.env };
const uri = env.MONGODB_URI || "";
const dbName = env.MONGODB_DB_NAME || "loanex";

const report = {
  envFileExists: fs.existsSync(envPath),
  mongoUriPresent: Boolean(uri),
  mongoUriLength: uri.length,
  mongoUriKind: /^mongodb(\+srv)?:\/\//i.test(uri) ? "mongodb" : uri ? "other" : "missing",
  hasPasswordInUri: /:([^@\/]+)@/.test(uri),
  dbName,
};

if (!uri || !/^mongodb(\+srv)?:\/\//i.test(uri)) {
  console.log(JSON.stringify({ ...report, ok: false, error: "MONGODB_URI missing or invalid" }, null, 2));
  process.exit(1);
}

(async () => {
  let MongoClient;
  try {
    ({ MongoClient } = require("mongodb"));
  } catch {
    console.log(JSON.stringify({ ...report, ok: false, error: "mongodb package not installed" }, null, 2));
    process.exit(2);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    const ping = await db.command({ ping: 1 });
    const cols = await db.listCollections().toArray();
    console.log(
      JSON.stringify(
        {
          ...report,
          ok: true,
          pingOk: ping?.ok === 1,
          existingCollections: cols.map((c) => c.name).sort(),
        },
        null,
        2
      )
    );
  } catch (e) {
    console.log(JSON.stringify({ ...report, ok: false, error: e.message }, null, 2));
    process.exit(3);
  } finally {
    await client.close().catch(() => {});
  }
})();
