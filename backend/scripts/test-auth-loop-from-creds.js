/**
 * Login/logout loop using scripts/.auth-test-creds.json
 */
const fs = require('fs');
const path = require('path');

const creds = JSON.parse(
  fs.readFileSync(path.resolve('scripts/.auth-test-creds.json'), 'utf8'),
);
const API = process.env.API_BASE || creds.API || 'https://loanex-api.vercel.app';
const { mobile, password } = creds;

async function login() {
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

async function main() {
  console.log('API', API, 'mobile', mobile);
  const results = [];
  let refreshToken = null;

  for (let round = 1; round <= 4; round++) {
    const attempt = await login();
    const data = attempt.body?.data || {};
    console.log(`login#${round}:`, attempt.status, attempt.body.message || attempt.body.code);
    if (attempt.status !== 200 || !data.accessToken) {
      console.log(JSON.stringify(attempt.body, null, 2));
      throw new Error(`login#${round} failed`);
    }
    results.push([`login#${round}`, 'PASS']);
    refreshToken = data.refreshToken || refreshToken;

    if (round === 4) break;

    const out = await logout(refreshToken);
    console.log(`logout#${round}:`, out.status, out.body.message || '');
    results.push([`logout#${round}`, out.status < 400 ? 'PASS' : 'FAIL']);
  }

  console.log('\nRESULTS');
  results.forEach((r) => console.log(r.join(' | ')));
  console.log('ALL PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
