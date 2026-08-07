import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { optionalAuthenticate } from '../../../common/middleware/optional-authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { reviewsController } from '../controller/reviews.controller';
import {
  createReviewSchema,
  productIdParamSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from '../validator/reviews.validator';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many review requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const reviewsRouter = Router();

reviewsRouter.use(limiter);

reviewsRouter.post(
  '/',
  authenticate,
  validateRequest(createReviewSchema),
  asyncHandler(reviewsController.create),
);
reviewsRouter.get(
  '/:productId',
  optionalAuthenticate,
  validateRequest(productIdParamSchema, 'params'),
  asyncHandler(reviewsController.listByProduct),
);
reviewsRouter.put(
  '/:reviewId',
  authenticate,
  validateRequest(reviewIdParamSchema, 'params'),
  validateRequest(updateReviewSchema),
  asyncHandler(reviewsController.update),
);
reviewsRouter.delete(
  '/:reviewId',
  authenticate,
  validateRequest(reviewIdParamSchema, 'params'),
  asyncHandler(reviewsController.delete),
);
