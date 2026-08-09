const path = require("path");
// Resolve paths relative to this repo (backend/scripts/migrate-mongo → backend).
const BACKEND = path.resolve(__dirname, "..", "..");
process.chdir(BACKEND);
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

(async () => {
  // Smoke via mongo hydrate helper instead.
  const dns = require("dns");
  dns.setServers(["8.8.8.8","1.1.1.1"]);
  const { MongoClient } = require("mongodb");
  const fs = require("fs");
  function loadEnv(p){const e={}; for(const line of fs.readFileSync(p,"utf8").split(/\r?\n/)){if(!line||line.trim().startsWith("#"))continue; const i=line.indexOf("="); if(i<0)continue; let k=line.slice(0,i).trim(); let v=line.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); e[k]=v;} return e;}
  const env = loadEnv(path.join(BACKEND, ".env"));
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env — Mongo is the only data source now.");
  }
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME || "loanex");
  const products = await db.collection("products").countDocuments();
  const orders = await db.collection("orders").countDocuments();
  const roles = await db.collection("roles").countDocuments();
  const notifications = await db.collection("notification").countDocuments();
  console.log(JSON.stringify({
    ok: true,
    mongo: { products, orders, roles, notifications },
  }, null, 2));
  await client.close();
})().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message})); process.exit(1);});
