import { z } from 'zod';

export const placeOrderItemSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(20).default(1),
  variantId: z.string().trim().nullable().optional(),
});

export const createCheckoutBodySchema = z.object({
  mode: z.enum(['BUY_NOW', 'CART']).optional().default('BUY_NOW'),
  productId: z.string().trim().optional(),
  variantId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(20).default(1),
  purchaseType: z.enum(['EMI', 'DIRECT']),
  addressId: z.string().trim().min(1).optional(),
  // Clients with a client-side cart (the mobile app) pass explicit items;
  // server-side carts are read via mode 'CART' instead.
  items: z.array(placeOrderItemSchema).max(20).optional(),
}).refine(data => {
  if (data.mode === 'BUY_NOW' && !data.productId) return false;
  return true;
}, { message: "Product is required for BUY_NOW mode", path: ["productId"] });

export const emiApplicationBodySchema = z.object({
  productName: z.string().trim().max(255).optional(),
  requestedAmount: z.coerce.number().positive('Requested loan amount must be positive'),
  requestedDownPayment: z.coerce.number().min(0, 'Down payment cannot be negative'),
  requestedTenure: z.coerce.number().int().min(1, 'Tenure must be at least 1 month').max(36, 'Tenure cannot exceed 36 months'),
  estimatedMonthlyEmi: z.coerce.number().positive('Estimated EMI must be positive'),
});

/**
 * One-shot order placement used by the mobile app (and any client that wants
 * to create a COD / DIRECT order or submit an EMI application in a single
 * call, instead of the session-based checkout flow).
 */
export const placeOrderBodySchema = z.object({
  items: z.array(placeOrderItemSchema).min(1, 'At least one item is required').max(10),
  addressId: z.string().trim().min(1).optional(),
  addressSnapshot: z.record(z.string(), z.unknown()).optional(),
  // Clients send `null` when no note is provided — accept it explicitly.
  notes: z.string().trim().max(1000).optional().nullable(),
  paymentMethod: z.enum(['COD', 'DIRECT']).default('COD'),
  /** Client-captured Razorpay payment id for DIRECT orders paid via a mobile SDK. */
  razorpayPaymentId: z.string().trim().min(1).optional(),
  /** When present, an EMI application is created instead of an order. */
  emiApplication: emiApplicationBodySchema.optional(),
});

export type PlaceOrderItem = z.infer<typeof placeOrderItemSchema>;
export type PlaceOrderBody = z.infer<typeof placeOrderBodySchema>;
export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
