import { RAZORPAY_CONFIG } from '../constants/config';

export interface RazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface VerifyResponse {
  status: 'ok' | 'error';
  message: string;
  payment_id?: string;
  order_id?: string;
}

export interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Fetch with timeout (10 seconds)
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

const BASE_URL = RAZORPAY_CONFIG.serverUrl;

/**
 * Checks if the Razorpay server is reachable.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`, { method: 'GET' }, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Creates a Razorpay order via our backend server.
 * Amount is in ₹ (will be converted to paise). Minimum: ₹1.
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  receipt?: string
): Promise<RazorpayOrder> {
  const url = `${BASE_URL}/api/create-order`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Convert ₹ to paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || err.details || 'Failed to create payment order');
  }

  return res.json();
}

/**
 * Verifies the Razorpay payment signature via our backend server.
 */
export async function verifyRazorpayPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): Promise<VerifyResponse> {
  const url = `${BASE_URL}/api/verify-payment`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(err.message || 'Payment verification failed');
  }

  return res.json();
}

/**
 * Generates the Razorpay checkout HTML that runs inside the WebView.
 * This HTML loads Razorpay's checkout.js and opens the payment modal.
 * Results are communicated back via window.ReactNativeWebView.postMessage().
 */
export function generateCheckoutHTML(params: {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill_email?: string;
  prefill_contact?: string;
  theme_color?: string;
}): string {
  const {
    key_id,
    order_id,
    amount,
    currency,
    name,
    description,
    prefill_email = '',
    prefill_contact = '',
    theme_color = '#E85D04',
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .loader {
      text-align: center;
      color: #666;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid ${theme_color};
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-box {
      text-align: center;
      padding: 32px;
      color: #EF4444;
    }
    .error-box h3 { margin-bottom: 8px; }
    .error-box button {
      margin-top: 16px;
      padding: 12px 24px;
      background: ${theme_color};
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="container">
    <div class="loader">
      <div class="spinner"></div>
      <p>Opening payment gateway...</p>
    </div>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"><\/script>
  <script>
    (function() {
      // postMessage bridge: native WebView exposes ReactNativeWebView; the web
      // fallback (iframe) posts to the parent window instead.
      var bridge = window.ReactNativeWebView || {
        postMessage: function(msg) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(msg, '*');
          }
        }
      };
      var options = {
        key: '${key_id}',
        amount: ${amount},
        currency: '${currency}',
        name: '${name.replace(/'/g, "\\'")}',
        description: '${description.replace(/'/g, "\\'")}',
        order_id: '${order_id}',
        prefill: {
          email: '${prefill_email}',
          contact: '${prefill_contact}'
        },
        theme: {
          color: '${theme_color}'
        },
        handler: function(response) {
          bridge.postMessage(JSON.stringify({
            event: 'payment.success',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          }));
        },
        modal: {
          ondismiss: function() {
            bridge.postMessage(JSON.stringify({
              event: 'payment.cancelled'
            }));
          },
          confirm_close: true
        }
      };

      try {
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
          bridge.postMessage(JSON.stringify({
            event: 'payment.failed',
            error_code: response.error.code,
            error_description: response.error.description,
            error_source: response.error.source,
            error_step: response.error.step,
            error_reason: response.error.reason
          }));
        });
        rzp.open();
      } catch(e) {
        document.getElementById('container').innerHTML =
          '<div class="error-box"><h3>Failed to open payment</h3><p>' + e.message + '<\/p>' +
          '<button onclick="bridge.postMessage(JSON.stringify({event:\\'payment.error\\',message: \\'' + e.message + '\\'}))">Close<\/button><\/div>';
      }
    })();
  <\/script>
</body>
</html>`;
}
