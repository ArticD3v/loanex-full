const u = process.env.DATABASE_URL || "";
const s = process.env.SUPABASE_URL || "";
const k = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const m = process.env.MONGODB_URI || "";
const d = process.env.MONGODB_DB_NAME || "";
console.log(
  JSON.stringify(
    {
      dbLen: u.length,
      dbPg: /^postgres/i.test(u),
      dbSens: /sensitive/i.test(u),
      sbLen: s.length,
      sbHttp: /^https?:/i.test(s),
      sbSens: /sensitive/i.test(s),
      keyLen: k.length,
      keySens: /sensitive/i.test(k),
      mongoLen: m.length,
      mongoOk: /^mongodb/i.test(m),
      mongoDbName: d || null,
      relatedKeys: Object.keys(process.env)
        .filter((x) => /MONGO|DATABASE|SUPABASE|DIRECT/i.test(x))
        .sort(),
    },
    null,
    2
  )
);
