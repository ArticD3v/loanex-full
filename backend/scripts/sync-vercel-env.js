/**
 * Sync backend/.env into Vercel Production without printing secret values.
 * Applies production-safe overrides for frontend URL / CORS / sync mode.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/** Primary customer frontend (used for redirects / emails). */
const FRONTEND_URL = 'https://www.mrloanex.com';

/**
 * Every browser origin that may call the production API.
 * Keep in sync with backend/src/config/env.ts CORS_ORIGINS default.
 * Do not strip custom domains — that causes live CORS failures.
 */
const PRODUCTION_CORS_ORIGINS = [
  FRONTEND_URL,
  'https://loanex.vercel.app',
  'https://www.mrloanex.com',
  'https://mrloanex.com',
  'https://www.loanex.in',
  'https://loanex.in',
  'https://admin-app-five-tan.vercel.app',
];

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

const env = parseEnvFile(path.join(__dirname, '..', '.env'));

// Production overrides (deployment configuration only)
env.NODE_ENV = 'production';
env.FRONTEND_URL = FRONTEND_URL;
// Merge any extra origins already in .env, but always keep production domains.
const fromEnv = (env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .filter((o) => !/localhost|127\.0\.0\.1/i.test(o));
env.CORS_ORIGINS = [...new Set([...PRODUCTION_CORS_ORIGINS, ...fromEnv])].join(',');
env.SUPABASE_SYNC_MODE = env.SUPABASE_SYNC_MODE || 'source';
env.OTP_DEV_ECHO = 'false';
env.PAYMENT_DEV_BYPASS = 'false';

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of required) {
  if (!env[key]) {
    console.error(`Missing required env key: ${key}`);
    process.exit(1);
  }
}

const keys = Object.keys(env).filter((k) => env[k] !== undefined && env[k] !== '');
let ok = 0;
let failed = 0;

for (const key of keys) {
  // Remove existing production value if present (ignore failure)
  spawnSync('npx', ['vercel', 'env', 'rm', key, 'production', '-y'], {
    stdio: 'ignore',
    shell: true,
  });

  const result = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, 'production'],
    {
      input: env[key],
      encoding: 'utf8',
      shell: true,
    },
  );

  if (result.status === 0) {
    ok += 1;
    console.info(`Set ${key}`);
  } else {
    failed += 1;
    const err = (result.stderr || result.stdout || '').toString().slice(0, 200);
    console.error(`Failed ${key}: ${err}`);
  }
}

console.info(`Env sync complete. set=${ok} failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);
