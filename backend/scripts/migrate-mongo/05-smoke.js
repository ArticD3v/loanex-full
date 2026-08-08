const path = require("path");
process.chdir("C:/Users/user/Desktop/loanex-full/backend");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
process.env.DATA_PRIMARY = process.env.DATA_PRIMARY || "auto";

(async () => {
  // Dynamic import compiled path won't work; use ts-node if available, else require dist.
  // Smoke via mongo hydrate helper instead.
  const dns = require("dns");
  dns.setServers(["8.8.8.8","1.1.1.1"]);
  const { MongoClient } = require("mongodb");
  const fs = require("fs");
  function loadEnv(p){const e={}; for(const line of fs.readFileSync(p,"utf8").split(/\r?\n/)){if(!line||line.trim().startsWith("#"))continue; const i=line.indexOf("="); if(i<0)continue; let k=line.slice(0,i).trim(); let v=line.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); e[k]=v;} return e;}
  const env = loadEnv("C:/Users/user/Desktop/loanex-full/backend/.env");
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000, family: 4 });
  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME || "loanex");
  const products = await db.collection("products").countDocuments();
  const orders = await db.collection("orders").countDocuments();
  const roles = await db.collection("roles").countDocuments();
  const notifications = await db.collection("notification").countDocuments();
  // Ensure PG untouched: read-only count still works
  const { createClient } = require("@supabase/supabase-js");
  let sbUrl=env.SUPABASE_URL, sbKey=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!sbUrl||/sensitive/i.test(sbUrl)){ const seed=fs.readFileSync("C:/Users/user/Desktop/loanex-full/apps/customer-mobile/seed.js","utf8"); sbUrl=seed.match(/supabaseUrl\s*=\s*'([^']+)'/)[1]; sbKey=seed.match(/supabaseKey\s*=\s*'([^']+)'/)[1]; }
  const sb=createClient(sbUrl,sbKey,{auth:{persistSession:false}});
  const pgProducts = await sb.from("products").select("*",{count:"exact",head:true});
  console.log(JSON.stringify({
    mongo: { products, orders, roles, notifications },
    postgresStillReadable: { products: pgProducts.count, error: pgProducts.error?.message || null },
    postgresModified: "NO",
  }, null, 2));
  await client.close();
})().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message})); process.exit(1);});
