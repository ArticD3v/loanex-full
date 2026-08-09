const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { createClient } = require("@supabase/supabase-js");
const { MongoClient } = require("mongodb");
dns.setServers(["8.8.8.8","1.1.1.1"]);
// Resolve paths relative to this repo (backend/scripts/migrate-mongo → backend).
const BACKEND = path.resolve(__dirname, "..", "..");
const ROOT = path.resolve(BACKEND, "..");
function loadEnv(p){const e={}; for(const line of fs.readFileSync(p,"utf8").split(/\r?\n/)){if(!line||line.trim().startsWith("#"))continue; const i=line.indexOf("="); if(i<0)continue; let k=line.slice(0,i).trim(); let v=line.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); e[k]=v;} return e;}
(async()=>{
  const env=loadEnv(path.join(BACKEND,".env"));
  let sbUrl=env.SUPABASE_URL, sbKey=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!sbUrl||/sensitive/i.test(sbUrl)){ const seed=fs.readFileSync(path.join(ROOT,"apps/customer-mobile/seed.js"),"utf8"); sbUrl=seed.match(/supabaseUrl\s*=\s*'([^']+)'/)[1]; sbKey=seed.match(/supabaseKey\s*=\s*'([^']+)'/)[1]; }
  const sb=createClient(sbUrl,sbKey,{auth:{persistSession:false}});
  const client=new MongoClient(env.MONGODB_URI,{serverSelectionTimeoutMS:20000,family:4});
  await client.connect();
  const db=client.db(env.MONGODB_DB_NAME||"loanex");
  const pairs=[
    ["products","products"],["orders","orders"],["categories","categories"],["brands","brands"],
    ["banners","banners"],["addresses","addresses"],["profiles","profiles"],["customer_kyc","customer_kyc"],
    ["notifications","notification"],["wishlist_items","wishlist_items"],["sub_categories","sub_categories"],
    ["dealers","dealers"],["warehouses","warehouses"],["suppliers","suppliers"],["manufacturers","manufacturers"],
    ["product_attributes","product_attributes"],["product_attribute_values","product_attribute_values"],
    ["emi_details","emi_details"],["digilocker_reports","digilocker_reports"],["product_dealers","product_dealers"],
    ["product_suppliers","product_suppliers"],["payment_transactions","paymentTransaction"],["users","users"],
  ];
  const validation=[];
  for(const [pg,mongo] of pairs){
    const {count,error}=await sb.from(pg).select("*",{count:"exact",head:true});
    const m=await db.collection(mongo).countDocuments();
    const pgCount=error?null:(count??0);
    let status="MATCHED";
    if(pgCount==null) status="FAILED";
    else if(m<pgCount) status="MISSING";
    else if(m>pgCount) status="DUPLICATE";
    validation.push({pg,mongo,pgCount,mongoCount:m,status});
  }
  const matched=validation.filter(v=>v.status==="MATCHED").length;
  const missing=validation.filter(v=>v.status==="MISSING");
  const dup=validation.filter(v=>v.status==="DUPLICATE");
  const failed=validation.filter(v=>v.status==="FAILED");
  const cols=await db.listCollections().toArray();
  fs.writeFileSync(path.join(BACKEND,"scripts/migrate-mongo/reports/validation.json"), JSON.stringify({validation,matched,missing,dup,failed},null,2));
  console.log(JSON.stringify({matched, missing:missing.length, duplicate:dup.length, failed:failed.length, missingDetail:missing, dupDetail:dup, collectionCount:cols.length},null,2));
  await client.close();
})().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message})); process.exit(1);});
