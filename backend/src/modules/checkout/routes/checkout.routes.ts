import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { checkoutController } from '../controller/checkout.controller';
import { createCheckoutBodySchema } from '../validator/checkout.validator';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many checkout requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const checkoutRouter = Router();

checkoutRouter.use(authenticate);
checkoutRouter.use(limiter);

checkoutRouter.post(
  '/',
  validateRequest(createCheckoutBodySchema),
  asyncHandler(checkoutController.create),
);

checkoutRouter.get(
  '/session/:sessionId',
  asyncHandler(checkoutController.getSession),
);

checkoutRouter.get('/:productId', asyncHandler(checkoutController.getSummary));
