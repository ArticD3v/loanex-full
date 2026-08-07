/**
 * Ensure public.users has auth columns required for durable login.
 * Usage:
 *   node scripts/ensure-users-auth-columns.js
 *   node scripts/ensure-users-auth-columns.js .env.vercel.prod
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envFile = process.argv[2] || '.env';
const envPath = path.resolve(process.cwd(), envFile);

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')];
    }),
);

const sql = `
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "password" VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "encryptedPassword" VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mobileVerified" BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mobile_verified" BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "token" TEXT NOT NULL,
  "userId" VARCHAR(255) REFERENCES public.users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON public.refresh_tokens ("token");
CREATE INDEX IF NOT EXISTS refresh_tokens_userId_idx ON public.refresh_tokens ("userId");
`;

async function main() {
  const connectionString = env.DIRECT_URL || env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL / DIRECT_URL missing in ' + envFile);
  }
  const host = (connectionString.match(/@([^/]+)/) || [])[1];
  console.log('Connecting to', host, 'via', envFile);

  const needsSsl = !/localhost|127\.0\.0\.1/i.test(connectionString);
  const client = new Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY column_name
    `);
    console.log(
      'users columns:',
      rows.map((r) => r.column_name).join(', '),
    );
    console.log('OK: auth columns ensured');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
