import { z } from 'zod';

export const createCheckoutBodySchema = z.object({
  mode: z.enum(['BUY_NOW', 'CART']).optional().default('BUY_NOW'),
  productId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(20).default(1),
  purchaseType: z.enum(['EMI', 'DIRECT']),
  addressId: z.string().trim().min(1).optional(),
}).refine(data => {
  if (data.mode === 'BUY_NOW' && !data.productId) return false;
  return true;
}, { message: "Product is required for BUY_NOW mode", path: ["productId"] });

export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
