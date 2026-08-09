import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  id: z.string().trim().min(1).optional(),
  // Variant id — the web cart sends this under `variantId`; the mobile app
  // and legacy callers may send it as `id`. Both are accepted.
  variantId: z.string().trim().min(1).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20),
});

export type AddCartItemBody = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemBody = z.infer<typeof updateCartItemSchema>;
