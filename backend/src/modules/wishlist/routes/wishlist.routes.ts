import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { wishlistController } from '../controller/wishlist.controller';
import { addWishlistItemSchema } from '../validator/wishlist.validator';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many wishlist requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const wishlistRouter = Router();

wishlistRouter.use(authenticate);
wishlistRouter.use(limiter);

wishlistRouter.get('/', asyncHandler(wishlistController.list));
wishlistRouter.post(
  '/',
  validateRequest(addWishlistItemSchema),
  asyncHandler(wishlistController.add),
);
wishlistRouter.get(
  '/status/:productId',
  asyncHandler(wishlistController.status),
);
wishlistRouter.delete(
  '/:wishlistItemId',
  asyncHandler(wishlistController.remove),
);
wishlistRouter.post(
  '/:wishlistItemId/move-to-cart',
  asyncHandler(wishlistController.moveToCart),
);
