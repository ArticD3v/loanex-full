const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Unescape common sequences from vercel env pull
    val = val.replace(/\\n/g, '\n');
    env[key] = val;
  }
  return env;
}

const env = loadEnv(path.join(__dirname, '..', '.env.runtime'));

function describe(name) {
  const v = env[name] || '';
  const looksRedacted = /sensitive|redacted|\[.*\]/i.test(v) && v.length < 40;
  return {
    name,
    length: v.length,
    looksRedacted,
    isPostgresUrl: /^postgres(ql)?:\/\//i.test(v),
    isHttpUrl: /^https?:\/\//i.test(v),
  };
}

console.log(
  JSON.stringify(
    [
      'DATABASE_URL',
      'DIRECT_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ].map(describe),
    null,
    2,
  ),
);

(async () => {
  const dbUrl = env.DIRECT_URL || env.DATABASE_URL;
  if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    console.log('NO_USABLE_DATABASE_URL');
    process.exit(2);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Discover columns on emi_applications
  const cols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'emi_applications'
    ORDER BY ordinal_position
  `);
  console.log('EMI_APPLICATIONS_COLUMNS', JSON.stringify(cols.rows));

  // Find the specific test application by number from UI
  const byNumber = await client.query(
    `
    SELECT *
    FROM emi_applications
    WHERE "applicationNumber" = $1
       OR application_number = $1
    LIMIT 5
  `,
    ['LX-EMI-20260807-0001'],
  ).catch(async (err) => {
    console.log('BY_NUMBER_QUERY_FALLBACK', err.message);
    // Try only camelCase then snake
    try {
      return await client.query(
        `SELECT * FROM emi_applications WHERE "applicationNumber" = $1 LIMIT 5`,
        ['LX-EMI-20260807-0001'],
      );
    } catch (e2) {
      return await client.query(
        `SELECT * FROM emi_applications WHERE application_number = $1 LIMIT 5`,
        ['LX-EMI-20260807-0001'],
      );
    }
  });

  console.log('MATCH_COUNT', byNumber.rowCount);
  console.log('MATCH_ROWS', JSON.stringify(byNumber.rows, null, 2));

  // Recent apps for context
  const recent = await client.query(`
    SELECT *
    FROM emi_applications
    ORDER BY COALESCE("createdAt", created_at) DESC NULLS LAST
    LIMIT 10
  `).catch(async (err) => {
    console.log('RECENT_FALLBACK', err.message);
    return client.query(`SELECT * FROM emi_applications LIMIT 10`);
  });
  console.log('RECENT_COUNT', recent.rowCount);
  console.log(
    'RECENT_SUMMARY',
    JSON.stringify(
      recent.rows.map((r) => ({
        id: r.id,
        applicationNumber: r.applicationNumber || r.application_number,
        userId: r.userId || r.user_id,
        profileId: r.profileId || r.profile_id,
        status: r.status,
        productName: r.productName || r.product_name,
        createdAt: r.createdAt || r.created_at,
        submittedAt: r.submittedAt || r.submitted_at,
      })),
      null,
      2,
    ),
  );

  // FK relationships referencing emi_applications
  const fks = await client.query(`
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_name AS parent_table,
      ccu.column_name AS parent_column,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'emi_applications'
  `);
  console.log('CHILD_FKS', JSON.stringify(fks.rows, null, 2));

  await client.end();
})().catch((err) => {
  console.error('FATAL', err.message);
  process.exit(1);
});
