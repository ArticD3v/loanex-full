const fs = require("fs");
const dns = require("dns");
const { MongoClient } = require("mongodb");

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

(async () => {
  const env = loadEnv("C:/Users/user/Desktop/loanex-full/backend/.env");
  const uri = env.MONGODB_URI;
  const dbName = env.MONGODB_DB_NAME || "loanex";
  const attempts = [];

  // Attempt 1: default
  try {
    const c = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
    await c.connect();
    const ping = await c.db(dbName).command({ ping: 1 });
    const cols = await c.db(dbName).listCollections().toArray();
    await c.close();
    console.log(JSON.stringify({ attempt: "default", ok: true, pingOk: ping.ok === 1, collections: cols.map(x => x.name) }));
    return;
  } catch (e) {
    attempts.push({ attempt: "default", ok: false, error: e.message });
  }

  // Attempt 2: force Google DNS for SRV
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    const c = new MongoClient(uri, { serverSelectionTimeoutMS: 12000, family: 4 });
    await c.connect();
    const ping = await c.db(dbName).command({ ping: 1 });
    const cols = await c.db(dbName).listCollections().toArray();
    await c.close();
    console.log(JSON.stringify({ attempt: "google-dns-ipv4", ok: true, pingOk: ping.ok === 1, collections: cols.map(x => x.name), prior: attempts }));
    return;
  } catch (e) {
    attempts.push({ attempt: "google-dns-ipv4", ok: false, error: e.message });
  }

  // Attempt 3: resolve SRV manually then use standard mongodb:// URI
  try {
    const srv = await dns.promises.resolveSrv("_mongodb._tcp.loanexdatabase.lxiotky.mongodb.net");
    let txt = [];
    try { txt = await dns.promises.resolveTxt("loanexdatabase.lxiotky.mongodb.net"); } catch {}
    const txtFlat = txt.map((a) => a.join("")).join("&");
    const hosts = srv.map((r) => `${r.name}:${r.port}`).join(",");
    // Build auth URI without logging it
    const user = "loanex";
    const pass = "loanex";
    let direct = `mongodb://${user}:${pass}@${hosts}/?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=loanexDatabase`;
    if (txtFlat) {
      // txt usually: authSource=admin&replicaSet=atlas-xxx
      direct = `mongodb://${user}:${pass}@${hosts}/?${txtFlat}&ssl=true&retryWrites=true&w=majority&appName=loanexDatabase`;
    }
    const c = new MongoClient(direct, { serverSelectionTimeoutMS: 20000, family: 4 });
    await c.connect();
    const ping = await c.db(dbName).command({ ping: 1 });
    const cols = await c.db(dbName).listCollections().toArray();
    await c.close();
    console.log(JSON.stringify({
      attempt: "manual-srv",
      ok: true,
      pingOk: ping.ok === 1,
      collections: cols.map((x) => x.name),
      srvHostCount: srv.length,
      hasTxt: Boolean(txtFlat),
      prior: attempts,
    }));
  } catch (e) {
    attempts.push({ attempt: "manual-srv", ok: false, error: e.message });
    console.log(JSON.stringify({ ok: false, attempts }, null, 2));
    process.exit(3);
  }
})();
