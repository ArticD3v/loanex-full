const fs = require("fs");
function load(p){const e={}; if(!fs.existsSync(p)) return e; for(const line of fs.readFileSync(p,"utf8").split(/\r?\n/)){ if(!line||line.trim().startsWith("#")) continue; const i=line.indexOf("="); if(i<0)continue; let k=line.slice(0,i).trim(); let v=line.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); e[k]=v; } return e; }
const env = load(".env.vercel-pull");
// Mongo is the single source of truth — Supabase/postgres env vars were retired.
const keys = ["MONGODB_URI", "MONGODB_DB_NAME"];
const out = { fileExists: fs.existsSync(".env.vercel-pull"), totalKeys: Object.keys(env).length, mongoRelated: Object.keys(env).filter(k=>/mongo/i.test(k)), report: keys.map(k=>{ const v=env[k]||""; let kind="missing"; if(v){ if(/^mongodb/i.test(v)) kind="mongodb"; else if(/^https?:/i.test(v)) kind="http"; else kind="set"; } return {key:k, present:!!v, length:v.length, kind, looksRedacted:/redacted|sensitive/i.test(v)&&v.length<40}; }) };
console.log(JSON.stringify(out,null,2));
