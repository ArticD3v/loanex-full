export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

export function ensureRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script error')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset['razorpay'] = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script error'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  await ensureRazorpayScript();
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK failed to load');
  }

  const rzp = new window.Razorpay(options);
  rzp.open();
}
