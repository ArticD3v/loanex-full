const m = process.env.MONGODB_URI || "";
const d = process.env.MONGODB_DB_NAME || "";
console.log(
  JSON.stringify(
    {
      mongoLen: m.length,
      mongoOk: /^mongodb/i.test(m),
      mongoDbName: d || null,
      relatedKeys: Object.keys(process.env)
        .filter((x) => /MONGO/i.test(x))
        .sort(),
    },
    null,
    2
  )
);
