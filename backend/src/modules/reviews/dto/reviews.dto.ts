import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().trim().min(10, 'Review must be at least 10 characters'),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    review: z.string().trim().min(10, 'Review must be at least 10 characters').optional(),
  })
  .refine((data) => data.rating !== undefined || data.review !== undefined, {
    message: 'At least one of rating or review is required',
  });

export type UpdateReviewBody = z.infer<typeof updateReviewSchema>;

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1),
});

export type ProductIdParam = z.infer<typeof productIdParamSchema>;

export const reviewIdParamSchema = z.object({
  reviewId: z.string().trim().min(1),
});

export type ReviewIdParam = z.infer<typeof reviewIdParamSchema>;
