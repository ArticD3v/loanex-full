/**
 * Verify password hash persists in Supabase, then exercise
 * production login → logout → login repeatedly.
 *
 * Usage:
 *   node scripts/test-auth-login-loop.js
 *   set API_BASE=https://... && node scripts/test-auth-login-loop.js
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const API = process.env.API_BASE || 'https://loanex-api.vercel.app';

function loadEnv(file) {
  return Object.fromEntries(
    fs
      .readFileSync(path.resolve(process.cwd(), file), 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')];
      }),
  );
}

const env = loadEnv('.env');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function login(mobile, password) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: mobile, password }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function logout(refreshToken) {
  const res = await fetch(`${API}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function pickTokens(body) {
  const data = body?.data || body;
  return {
    accessToken: data?.accessToken,
    refreshToken: data?.refreshToken,
  };
}

async function main() {
  console.log('API', API);
  const mobile = '9' + String(Date.now()).slice(-9);
  const email = `authloop_${Date.now()}@loanex-test.in`;
  const password = 'TestPass@12345';
  const id = randomUUID();
  const hash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  console.log('Creating durable user', { id, mobile, email });

  const row = {
    id,
    phone: mobile,
    email,
    role: 'authenticated',
    encryptedPassword: hash,
    created_at: now,
    updated_at: now,
    updatedAt: now,
  };

  const { error: upsertErr } = await supabase.from('users').upsert([row], { onConflict: 'id' });
  if (upsertErr) throw new Error('Supabase upsert failed: ' + upsertErr.message);

  const { data: stored, error: readErr } = await supabase
    .from('users')
    .select('id,phone,encryptedPassword')
    .eq('id', id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!stored?.encryptedPassword) throw new Error('encryptedPassword missing after upsert');
  console.log('Supabase has password hash:', stored.encryptedPassword.slice(0, 12) + '...');

  await supabase.from('profiles').upsert(
    [
      {
        id,
        mobile_number: mobile,
        fullName: 'Auth Loop Test',
        email,
        createdAt: now,
        updatedAt: now,
      },
    ],
    { onConflict: 'id' },
  );

  // Also verify the app's sanitize helper shape matches this successful upsert.
  const { sanitizeMirrorPayload } = require('../dist/config/mirror-sanitize');
  const dirty = {
    ...row,
    createdAt: now,
    status: 'ACTIVE',
    mobileVerified: true,
    mobile_verified: true,
  };
  const clean = sanitizeMirrorPayload('users', dirty, 'insert');
  if ('createdAt' in clean || 'status' in clean || 'mobileVerified' in clean) {
    throw new Error('sanitizeMirrorPayload still forwards forbidden columns: ' + Object.keys(clean));
  }
  console.log('sanitize keys OK:', Object.keys(clean).join(','));

  const results = [];
  let refreshToken = null;

  for (let round = 1; round <= 4; round++) {
    let attempt = null;
    for (let i = 0; i < 8; i++) {
      attempt = await login(mobile, password);
      const tokens = pickTokens(attempt.body);
      console.log(
        `login#${round} try ${i + 1}:`,
        attempt.status,
        attempt.body.message || attempt.body.code || '',
      );
      if (attempt.status === 200 && tokens.accessToken) {
        refreshToken = tokens.refreshToken || refreshToken;
        results.push([`login#${round}`, 'PASS', attempt.status]);
        break;
      }
      await new Promise((r) => setTimeout(r, 4000));
    }

    const tokens = pickTokens(attempt.body);
    if (attempt.status !== 200 || !tokens.accessToken) {
      console.log(JSON.stringify(attempt.body, null, 2));
      throw new Error(`login#${round} failed`);
    }

    if (round === 4) break;

    if (refreshToken) {
      const out = await logout(refreshToken);
      console.log(`logout#${round}:`, out.status, out.body.message || '');
      results.push([`logout#${round}`, out.status < 400 ? 'PASS' : 'FAIL', out.status]);
    } else {
      results.push([`logout#${round}`, 'SKIP', 'no refresh']);
    }
  }

  console.log('\nRESULTS');
  for (const row of results) console.log(row.join(' | '));

  await supabase.from('profiles').delete().eq('id', id);
  await supabase.from('users').delete().eq('id', id);
  console.log('Cleaned up test user');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
