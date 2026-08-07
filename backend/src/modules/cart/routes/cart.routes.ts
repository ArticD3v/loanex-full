import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { cartController } from '../controller/cart.controller';
import { addCartItemSchema, updateCartItemSchema } from '../validator/cart.validator';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many cart requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const cartRouter = Router();

cartRouter.use(authenticate);
cartRouter.use(limiter);

cartRouter.get('/', asyncHandler(cartController.getCart));
cartRouter.post(
  '/',
  validateRequest(addCartItemSchema),
  asyncHandler(cartController.addItem),
);
cartRouter.delete('/', asyncHandler(cartController.clear));
cartRouter.put(
  '/:cartItemId',
  validateRequest(updateCartItemSchema),
  asyncHandler(cartController.updateItem),
);
cartRouter.delete('/:cartItemId', asyncHandler(cartController.removeItem));
cartRouter.post(
  '/:cartItemId/move-to-wishlist',
  asyncHandler(cartController.moveToWishlist),
);
