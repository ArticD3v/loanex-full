import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { autopayController } from '../controller/autopay.controller';
import { createMandateSchema } from '../validator/autopay.validator';

const autopayRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many AutoPay requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const autopayRouter = Router();

autopayRouter.use(authenticate);
autopayRouter.use(autopayRateLimiter);

autopayRouter.get('/status', asyncHandler(autopayController.getStatus));
autopayRouter.get('/history', asyncHandler(autopayController.getHistory));
autopayRouter.post(
  '/create-mandate',
  validateRequest(createMandateSchema),
  asyncHandler(autopayController.createMandate),
);
autopayRouter.post('/cancel-mandate', asyncHandler(autopayController.cancelMandate));
