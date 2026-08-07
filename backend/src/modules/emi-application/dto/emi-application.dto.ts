import { z } from 'zod';

export const createEmiApplicationBodySchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(100),
  productName: z.string().trim().min(1).max(255).optional(),
  sellingPrice: z.coerce.number().positive('Selling price must be positive'),
  requestedAmount: z.coerce.number().positive('Requested loan amount must be positive'),
  requestedDownPayment: z.coerce.number().min(0, 'Down payment cannot be negative'),
  requestedTenure: z.coerce
    .number()
    .int()
    .refine((value) => [3, 6, 9, 12].includes(value), 'Tenure must be 3, 6, 9, or 12 months'),
  estimatedMonthlyEmi: z.coerce.number().positive('Estimated EMI must be positive'),
});

export type CreateEmiApplicationBody = z.infer<typeof createEmiApplicationBodySchema>;
