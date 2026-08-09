#!/usr/bin/env node
/**
 * smoke-emi-banner.mjs — EMI down-payment redirect smoke test.
 *
 * Catches regressions in the EMI down-payment → /order/confirmation banner:
 *
 *   1. API part (non-mutating): against the running backend, logs in as the
 *      test customer and exercises the redirect contract:
 *        - GET  /payments/down-payment   → 409 PAYMENT_ALREADY_COMPLETED with
 *          orderNumber + nextStep=ORDER_CONFIRMATION (the "don't pay again"
 *          redirect the frontend consumes).
 *        - POST /payments/verify         → 200 alreadyProcessed=true with
 *          orderNumber + loanAccountNumber (the replayed redirect — exactly the
 *          params the UI uses to build the /order/confirmation URL).
 *
 *   2. Render part (real DOM): runs the order-confirmation Karma spec in
 *      headless Chrome, which renders the page with the redirect params and
 *      asserts the banner + payment id are actually in the DOM.
 *
 * Requirements: customer-web deps installed (karma + a Chrome browser), the
 * backend reachable (default http://localhost:4000), and MONGODB_URI in
 * backend/.env (used only to find an already-paid down-payment transaction to
 * re-verify — read-only, no writes).
 *
 * Usage:
 *   node scripts/smoke-emi-banner.mjs
 *   LOANEX_SMOKE_BACKEND=http://localhost:4000 node scripts/smoke-emi-banner.mjs
 *   node scripts/smoke-emi-banner.mjs --skip-api --skip-render
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_DIR = join(ROOT, 'backend');
const CUSTOMER_WEB_DIR = join(ROOT, 'customer-web');

const BACKEND_URL = (process.env.LOANEX_SMOKE_BACKEND ?? 'http://localhost:4000').replace(/\/+$/, '');
const API = `${BACKEND_URL}/api/v1`;
const IDENTIFIER = process.env.LOANEX_SMOKE_IDENTIFIER ?? '9462557060';
const PASSWORD = process.env.LOANEX_SMOKE_PASSWORD ?? 'Musharraf@1';

const SKIP_API = process.argv.includes('--skip-api');
const SKIP_RENDER = process.argv.includes('--skip-render');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return { ok: false, status: 0, json: null, raw: String(err?.message ?? err) };
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  // The backend wraps every response in { success, data } (or on error
  // { success, code, details }) — unwrap so assertions read the payload.
  const data = json && typeof json === 'object' && 'data' in json ? json.data : json;
  return { ok: res.ok, status: res.status, json: data, raw: `HTTP ${res.status}` };
}

/** Read a key from backend/.env (dotenv semantics, no dependency). */
function envFromDotenv(key) {
  const file = join(BACKEND_DIR, '.env');
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] !== key) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

/** Latest SUCCESS DOWN_PAYMENT transaction for the customer (read-only). */
async function findPaidDownPaymentTransaction() {
  const require = createRequire(join(BACKEND_DIR, 'package.json'));
  const dns = require('node:dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']); // dev ISP DNS workaround used by mongo.ts
  const { MongoClient } = require('mongodb');
  const uri = envFromDotenv('MONGODB_URI');
  if (!uri) return null;
  const dbName = envFromDotenv('MONGODB_DB_NAME') ?? 'loanex';
  const client = new MongoClient(uri, {
    connectTimeoutMS: 15_000,
    serverSelectionTimeoutMS: 15_000,
  });
  try {
    await client.connect();
    const txns = await client
      .db(dbName)
      .collection('paymentTransaction')
      .find({ paymentStatus: 'SUCCESS', paymentType: 'DOWN_PAYMENT' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    return txns[0] ?? null;
  } finally {
    await client.close().catch(() => {});
  }
}

async function exerciseApiRedirectContract(token) {
  console.log('\n[1/2] API · down-payment redirect contract');

  // Context: the customer's DP is already paid → the frontend gets the
  // ORDER_CONFIRMATION redirect instead of a fresh payment page. The 409
  // body arrives as { success:false, code, details } — unwrap details too.
  const ctx = await request('/payments/down-payment', { token });
  const ctxDetails = ctx.json?.details ?? {};
  check(
    'GET /payments/down-payment → 409 PAYMENT_ALREADY_COMPLETED',
    ctx.status === 409 && (ctx.json?.code === 'PAYMENT_ALREADY_COMPLETED' || ctxDetails.code === 'PAYMENT_ALREADY_COMPLETED'),
    ctx.raw,
  );
  check(
    '…carries orderNumber + nextStep=ORDER_CONFIRMATION',
    Boolean(ctxDetails.orderNumber) && ctxDetails.nextStep === 'ORDER_CONFIRMATION',
    JSON.stringify(ctxDetails),
  );

  // Replay the verify with an already-paid transaction — this is the branch
  // that answers a duplicate/crash retry and feeds the banner's
  // alreadyProcessed variant. Signature is intentionally not validated on
  // SUCCESS transactions (the SUCCESS short-circuit precedes it).
  let txn = null;
  try {
    txn = await findPaidDownPaymentTransaction();
  } catch (err) {
    console.log(`  …mongo lookup failed (${err?.message ?? err}) — skipping re-verify step`);
  }
  if (txn?.razorpayOrderId) {
    const verify = await request('/payments/verify', {
      method: 'POST',
      token,
      body: {
        razorpayOrderId: txn.razorpayOrderId,
        razorpayPaymentId: 'pay_smoke_replay',
        razorpaySignature: 'smoke_signature_placeholder',
      },
    });
    check(
      'POST /payments/verify (already-paid) → alreadyProcessed=true',
      verify.ok &&
        verify.json?.paymentStatus === 'SUCCESS' &&
        verify.json?.alreadyProcessed === true &&
        verify.json?.nextStep === 'ORDER_CONFIRMATION',
      verify.ok ? JSON.stringify(verify.json) : verify.raw,
    );
    check(
      '…returns orderNumber + loanAccountNumber (redirect params)',
      Boolean(verify.json?.orderNumber) && Boolean(verify.json?.loanAccountNumber),
      verify.ok ? JSON.stringify(verify.json) : '',
    );
    if (verify.ok) {
      console.log(
        `  …frontend would redirect to: /order/confirmation?paymentSuccess=true&paymentId=${'<real pid>'}&alreadyProcessed=true&orderId=${verify.json.orderId ?? verify.json.orderNumber}`,
      );
    }
  } else {
    console.log('  …no paid DOWN_PAYMENT transaction found — re-verify step skipped');
  }
}

async function renderBannerInHeadlessChrome() {
  console.log('\n[2/2] Render · banner + payment id on /order/confirmation (headless Chrome)');

  // karma is pinned to port 9876 (karma.conf.js) — fail fast instead of a
  // 10-minute capture timeout if the port is already taken.
  const portTaken = await new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: 9876, timeout: 1500 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
  check('karma port 9876 is free', !portTaken, portTaken ? 'port in use — kill the stale karma/ng test process' : '');
  if (portTaken) return;

  // Windows needs the .cmd shim invoked via cmd.exe; `npx ng` resolves it.
  // ChromeHeadlessNoSandbox is defined in customer-web/karma.conf.js (which
  // also pins port 9876 — Freebuff Desktop occupies the ephemeral 54xxx range
  // karma would otherwise pick, and a wrong port makes Chrome never capture).
  const result = spawnSync('npx', ['ng', 'test', '--watch=false', '--browsers=ChromeHeadlessNoSandbox'], {
    cwd: CUSTOMER_WEB_DIR,
    shell: process.platform === 'win32',
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 10 * 60 * 1000,
    env: { ...process.env, CHROME_BIN: process.env.CHROME_BIN ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
  });

  const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const summary = out
    .split(/\r?\n/)
    .filter((line) => /Executed|FAILED|SUCCESS|TOTAL|Error:|Cannot find|An error occurred/.test(line))
    .slice(-12)
    .join('\n');
  if (result.status !== 0) console.log(summary || `ng test exited with ${result.status}`);
  else console.log(summary || 'ng test passed');
  check('ng test (banner spec) exits 0', result.status === 0);
}

async function main() {
  console.log(`LoanEx · EMI down-payment banner smoke`);
  console.log(`backend: ${BACKEND_URL} · customer: ${IDENTIFIER}`);

  let token = null;
  if (!SKIP_API) {
    const login = await request('/auth/login', {
      method: 'POST',
      body: { identifier: IDENTIFIER, password: PASSWORD },
    });
    check('customer login', login.ok && Boolean(login.json?.accessToken), login.raw);
    if (!login.ok) {
      console.error(
        '\nLogin failed — set LOANEX_SMOKE_IDENTIFIER / LOANEX_SMOKE_PASSWORD (or start the backend on :4000).',
      );
      process.exit(1);
    }
    token = login.json.accessToken;
    await exerciseApiRedirectContract(token);
  }

  if (!SKIP_RENDER) {
    await renderBannerInHeadlessChrome();
  }

  console.log(
    failures === 0
      ? `\n✅ smoke-emi-banner PASSED (${SKIP_API ? 'api skipped' : 'api ok'}${SKIP_RENDER ? ', render skipped' : ', render ok'})`
      : `\n❌ smoke-emi-banner FAILED — ${failures} assertion(s)`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('smoke-emi-banner crashed:', err);
  process.exit(1);
});
