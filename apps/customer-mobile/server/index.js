const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Initialize Razorpay ────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── POST /api/create-order ─────────────────────────────────────────────
// Creates a Razorpay order. Minimum amount: 100 paise (₹1).
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Must be at least 100 paise (₹1).',
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        source: 'loanex_app',
      },
    });

    console.log(`[Razorpay] Order created: ${order.id} (₹${(order.amount / 100).toFixed(2)})`);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Razorpay] Create order error:', err);
    if (err.statusCode === 401) {
      return res.status(401).json({
        error: 'Authentication failed',
        details: err.error?.description || err.message,
      });
    }
    res.status(500).json({
      error: 'Failed to create Razorpay order',
      details: err.error?.description || err.message,
    });
  }
});

// ─── POST /api/verify-payment ───────────────────────────────────────────
// Verifies the HMAC-SHA256 signature returned by Razorpay.
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
      });
    }

    // Generate expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      console.log(`[Razorpay] Payment verified: ${razorpay_payment_id} for order ${razorpay_order_id}`);
      res.json({
        status: 'ok',
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    } else {
      console.warn(`[Razorpay] Signature mismatch for order ${razorpay_order_id}`);
      res.status(400).json({
        status: 'error',
        message: 'Payment verification failed — signature mismatch',
      });
    }
  } catch (err) {
    console.error('[Razorpay] Verify error:', err);
    res.status(500).json({
      error: 'Verification failed',
      details: err.message,
    });
  }
});

// ─── Health check ───────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════
// IDSPay DigiLocker Digital KYC
// ═══════════════════════════════════════════════════════════════════════
const IDSPAY_BASE_URL = process.env.IDSPAY_BASE_URL;

// Helper: call the IDSPay DigiLocker API
async function callIDSPay(payload) {
  // IDSPay validation actually requires fields at the root level
  const body = {
    api_id: process.env.IDSPAY_API_ID,
    api_key: process.env.IDSPAY_API_KEY,
    token_id: process.env.IDSPAY_TOKEN_ID,
    ...payload
  };
  const res = await fetch(IDSPAY_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ status: { code: res.status, type: 'error', message: 'Invalid response from IDSPay' } }));
  return { status: res.status, data };
}

// ─── POST /api/kyc/digilocker/generate-token ─────────────────────────────
// Generates a DigiLocker auth token for a given Aadhaar number.
// The user then opens the returned `url` in a WebView and authenticates.
app.post('/api/kyc/digilocker/generate-token', async (req, res) => {
  try {
    const payload = {
      methodName: 'generateToken',
      mobile_number: '9999999999', // Dummy number to satisfy IDSPay's validation. User enters real info on DigiLocker page.
      redirectUrl: process.env.IDSPAY_REDIRECT_URL,
      logoUrl: process.env.IDSPAY_LOGO_URL,
    };

    const { status, data } = await callIDSPay(payload);

    if (status !== 200 || data.status?.code !== 200) {
      console.warn('[IDSPay] generateToken failed:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Failed to generate DigiLocker token',
        details: data.status?.message || data.message || 'Unknown error',
      });
    }

    console.log(`[IDSPay] Token generated successfully (client_id: ${data.data?.client_id})`);
    res.json({
      client_id: data.data?.client_id,
      token: data.data?.token,
      url: data.data?.url,
      expiry_seconds: data.data?.expiry_seconds,
    });
  } catch (err) {
    console.error('[IDSPay] generateToken error:', err.message);
    res.status(500).json({ error: 'Failed to generate DigiLocker token', details: err.message });
  }
});

// ─── POST /api/kyc/digilocker/fetch-details ─────────────────────────────
// Fetches verified document details after the user authenticates in DigiLocker.
app.post('/api/kyc/digilocker/fetch-details', async (req, res) => {
  try {
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'Missing client_id' });
    }

    const payload = {
      methodName: 'fetchDetails',
      client_id,
    };

    const { status, data } = await callIDSPay(payload);

    if (status !== 200 || data.status?.code !== 200) {
      console.warn('[IDSPay] fetchDetails failed:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Failed to fetch DigiLocker details',
        details: data.status?.message || data.message || 'Unknown error',
      });
    }

    console.log(`[IDSPay] Details fetched for client_id ${client_id}`);
    res.json({
      status: 'ok',
      data: data.data,
    });
  } catch (err) {
    console.error('[IDSPay] fetchDetails error:', err.message);
    res.status(500).json({ error: 'Failed to fetch DigiLocker details', details: err.message });
  }
});

// ─── POST /api/kyc/pan/verify ─────────────────────────────
// Verifies PAN number against Income Tax Department records.
app.post('/api/kyc/pan/verify', async (req, res) => {
  try {
    const { pan_number } = req.body;

    if (!pan_number) {
      return res.status(400).json({ error: 'Missing pan_number' });
    }

      api_id: process.env.IDSPAY_API_ID,
      api_key: process.env.IDSPAY_API_KEY,
      token_id: process.env.IDSPAY_TOKEN_ID,
      pan: pan_number,
    };

    const response = await fetch('https://javabackend.idspay.in/api/v1/prod/pan/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.status !== 200 || data.status?.code !== 200) {
      console.warn('[IDSPay] panVerification failed:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Failed to verify PAN',
        details: data.status?.message || data.message || 'Unknown error',
      });
    }

    console.log(`[IDSPay] PAN verified successfully for ${pan_number}`);
    res.json(data.data?.data || {});
  } catch (err) {
    console.error('[IDSPay] panVerification error:', err.message);
    res.status(500).json({ error: 'Failed to verify PAN', details: err.message });
  }
});

// ─── POST /api/kyc/experian ─────────────────────────────
// Fetches the Experian credit report.
app.post('/api/kyc/experian', async (req, res) => {
  try {
    const { mobile, pan, firstName, lastName, dob } = req.body;

    if (!mobile || !pan || !firstName || !lastName || !dob) {
      return res.status(400).json({ error: 'Missing required fields for Experian' });
    }

    const payload = {
      api_id: process.env.IDSPAY_API_ID,
      api_key: process.env.IDSPAY_API_KEY,
      token_id: process.env.IDSPAY_TOKEN_ID,
      mobile_no: mobile,
      pan: pan,
      first_name: firstName,
      last_name: lastName,
      dob: dob,
    };

    const response = await fetch('https://javabackend.idspay.in/api/v1/prod/srv2/credit-report/experian', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!data) {
      return res.status(500).json({ error: 'Server returned an invalid response (HTML or empty).' });
    }

    if (response.status !== 200 || data.status?.code !== 200) {
      console.warn('[IDSPay] Experian failed:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Failed to fetch Experian report',
        details: data.status?.message || data.message || 'Unknown error',
        data: data
      });
    }

    console.log(`[IDSPay] Experian report fetched successfully for ${pan}`);
    res.json(data);
  } catch (err) {
    console.error('[IDSPay] experian error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Experian report', details: err.message });
  }
});

// ─── AUTHKEY OTP LOGIC ────────────────────────────────────────────────────
const otpStore = new Map(); // Stores { mobile: { otp, expiresAt } }

app.post('/api/kyc/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: 'Mobile number required' });

    // Generate random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore.set(mobile, { otp, expiresAt });

    const authkey = process.env.AUTHKEY_API_KEY;
    const sid = process.env.AUTHKEY_SENDER_ID;
    const company = process.env.AUTHKEY_COMPANY_NAME;

    if (!authkey || !sid) {
      console.warn('[Authkey] Missing API keys. Storing OTP in memory only for dev testing. OTP:', otp);
      return res.json({ success: true, message: 'OTP sent (dev mode)' });
    }

    const url = new URL('https://api.authkey.io/request');
    url.searchParams.append('authkey', authkey);
    url.searchParams.append('mobile', mobile);
    url.searchParams.append('country_code', '91');
    url.searchParams.append('sid', sid);
    url.searchParams.append('company', company || 'LoanEx');
    url.searchParams.append('otp', otp);

    const response = await fetch(url.toString());
    const data = await response.text();
    console.log('[Authkey] Send OTP Response:', data);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('[Authkey] Error sending OTP:', err.message);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/kyc/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required' });

  const record = otpStore.get(mobile);
  if (!record) {
    return res.status(400).json({ error: 'OTP not found or expired' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(mobile);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (record.otp !== otp && otp !== '1111') { // Fallback for dev testing
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  otpStore.delete(mobile);
  res.json({ success: true, message: 'OTP verified' });
});

// ─── POST /api/kyc/face-match ───────────────────────────────────────────
app.post('/api/kyc/face-match', async (req, res) => {
  try {
    const { personBase64, cardBase64 } = req.body;
    if (!personBase64 || !cardBase64) {
      return res.status(400).json({ error: 'Missing personBase64 or cardBase64' });
    }

    const form = new FormData();
    form.append('api_id', process.env.IDSPAY_API_ID);
    form.append('api_key', process.env.IDSPAY_API_KEY);
    form.append('token_id', process.env.IDSPAY_TOKEN_ID);

    // Convert base64 to Blob
    const personBuffer = Buffer.from(personBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const cardBuffer = Buffer.from(cardBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // In Node.js 18+ fetch FormData, we use Blob
    form.append('person', new Blob([personBuffer], { type: 'image/jpeg' }), 'person.jpg');
    form.append('card', new Blob([cardBuffer], { type: 'image/jpeg' }), 'card.jpg');

    const response = await fetch('https://javabackend.idspay.in/api/v1/prod/srv2/face-api/match', {
      method: 'POST',
      body: form
    });

    const data = await response.json().catch(() => ({ status: { code: response.status, type: 'error', message: 'Invalid response from IDSPay' } }));

    if (data.status?.code !== 200) {
      console.warn('[IDSPay] face-match failed:', JSON.stringify(data));
      return res.status(data.status?.code || 400).json(data);
    }

    console.log(`[IDSPay] Face match successful`);
    res.json(data);
  } catch (err) {
    console.error('[IDSPay] face-match error:', err.message);
    res.status(500).json({
      status: { code: 500, type: 'error', message: 'Internal server error' },
      error: 'Face match failed',
      details: err.message,
    });
  }
});

// ─── Start server ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║     LoanEx Payment + KYC Server          ║
║     Running on port ${PORT}                  ║
║     • Razorpay Payments                   ║
║     • IDSPay DigiLocker KYC               ║
╚════════════════════════════════════════════╝
  `);
});
