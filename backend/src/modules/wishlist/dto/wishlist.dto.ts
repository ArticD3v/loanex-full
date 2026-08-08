import { z } from 'zod';

export const addWishlistItemSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  id: z.string().trim().min(1).optional(),
});

export type AddWishlistItemBody = z.infer<typeof addWishlistItemSchema>;
