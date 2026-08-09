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

/** Remove any leftover Razorpay checkout overlay elements from the DOM.
 *  Razorpay normally tears down its container when the checkout closes, but in
 *  some browsers/edge cases (abrupt dismiss, failed iframe load) the
 *  full-screen .razorpay-container can linger and silently block the page
 *  behind the failure panel. Safe to call any time — no-ops when nothing is
 *  present. */
export function removeRazorpayOverlay(): void {
  const selectors = [
    '.razorpay-container',
    '.razorpay-backdrop',
    '.razorpay-checkout-frame',
    '#__rzp-meta',
  ];
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  }
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  await ensureRazorpayScript();
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK failed to load');
  }

  // Wrap the dismiss handler so every consumer gets the stale-overlay cleanup
  // automatically — the checkout may have closed without tearing down its DOM.
  const userOnDismiss = options.modal?.ondismiss;
  const checkoutOptions: RazorpayCheckoutOptions = {
    ...options,
    modal: {
      ...options.modal,
      ondismiss: () => {
        removeRazorpayOverlay();
        userOnDismiss?.();
      },
    },
  };

  const rzp = new window.Razorpay(checkoutOptions);
  try {
    rzp.open();
  } catch (error) {
    // The checkout failed partway through opening — drop any partial overlay
    // it created before rethrowing so the failure panel stays usable.
    removeRazorpayOverlay();
    throw error;
  }
}
