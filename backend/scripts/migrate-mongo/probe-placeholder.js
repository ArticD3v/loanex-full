const fs = require("fs");
const path = require("path");
const root = "C:/Users/user/Desktop/loanex-full";
const paths = [
  path.join(root, ".env.vercel-pull"),
  path.join(root, "backend", ".env.vercel-pull"),
  path.join(root, "backend", ".env.runtime"),
  path.join(root, "backend", ".env.decrypted"),
];
for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.log(JSON.stringify({ path: p, exists: false }));
    continue;
  }
  const text = fs.readFileSync(p, "utf8");
  const get = (k) => {
    const m = text.match(new RegExp("^" + k + "=(.*)$", "m"));
    return m ? m[1].trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "") : "";
  };
  const keys = ["MONGODB_URI", "MONGODB_DB_NAME", "DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const report = keys.map((k) => {
    const v = get(k);
    return {
      key: k,
      present: !!v,
      length: v.length,
      startsWithPostgres: /^postgres/i.test(v),
      startsWithHttp: /^https?:/i.test(v),
      startsWithMongo: /^mongodb/i.test(v),
      isBracketRedacted: v === "[REDACTED]" || v === "[redacted]",
      isSensitiveWord: /sensitive/i.test(v),
      isAllStars: /^\*+$/.test(v),
      firstCode: v ? v.charCodeAt(0) : null,
      lastCode: v ? v.charCodeAt(v.length - 1) : null,
    };
  });
  console.log(JSON.stringify({ path: p, size: fs.statSync(p).size, report }, null, 2));
}
