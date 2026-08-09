import { api } from '../lib/apiClient';

// ─── Types (mirror the backend /checkout session flow) ──────────────────────

export interface CheckoutSession {
  sessionId: string;
  purchaseType: 'DIRECT' | 'EMI';
  amount: number;
  currency: string;
  itemCount: number;
  expiresAt?: string | null;
}

export interface CodRules {
  maxAmount: number;
  codAllowed: boolean;
  totalAmount: number;
}

export interface CheckoutPaymentOrder {
  sessionId: string;
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  paymentDevBypass: boolean;
  prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>;
}

export interface CheckoutVerifyResponse {
  success: boolean;
  alreadyProcessed: boolean;
  orderId?: string;
  orderNumber?: string;
  paymentId?: string | null;
  amountPaid?: number;
  message: string;
}

export interface CreateCheckoutSessionInput {
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string | null;
  }>;
  addressId?: string;
  addressSnapshot?: {
    label?: string;
    fullAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  notes?: string;
  /** 'DIRECT' for full-payment checkout. EMI applications use place-order. */
  paymentMethod?: string;
}

/**
 * COD availability for a cart total — the same codRules the web checkout
 * summary derives from (backend env COD_MAX_AMOUNT).
 */
export async function getCodRules(amount: number): Promise<CodRules> {
  const res = await api.get(`/checkout/cod-rules?amount=${encodeURIComponent(amount)}`);
  return res.data;
}

/**
 * Create a server-side checkout session (price + stock validated by backend).
 * The mobile cart lives client-side, so explicit items are sent — the backend
 * resolves them with authoritative pricing/stock rules.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSession> {
  const res = await api.post('/checkout', {
    mode: 'CART',
    items: input.items,
    addressId: input.addressId,
    purchaseType: 'DIRECT',
  });
  const data = res.data ?? {};
  return {
    sessionId: data.session?.id ?? data.id ?? '',
    purchaseType: data.session?.purchaseType ?? 'DIRECT',
    amount: data.session?.totalAmount ?? data.summary?.pricing?.totalAmount ?? 0,
    currency: data.summary?.pricing?.currency ?? 'INR',
    itemCount: data.session?.items?.length ?? 0,
    expiresAt: data.session?.expiresAt ?? null,
  };
}

/** Create the Razorpay payment order for a DIRECT session. */
export async function createCheckoutPaymentOrder(
  sessionId: string,
): Promise<CheckoutPaymentOrder> {
  const res = await api.post(`/checkout/${sessionId}/payment/order`, {});
  return res.data;
}

/** Dev-only: sign a payment without Razorpay (PAYMENT_DEV_BYPASS=true). */
export async function createCheckoutDevBypassSignature(sessionId: string): Promise<{
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}> {
  const res = await api.post(`/checkout/${sessionId}/payment/dev-bypass-signature`, {});
  return res.data;
}

/** Verify the Razorpay payment and complete the DIRECT order. */
export async function verifyCheckoutPayment(
  sessionId: string,
  payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
): Promise<CheckoutVerifyResponse> {
  const res = await api.post(`/checkout/${sessionId}/payment/verify`, payload);
  return res.data;
}
