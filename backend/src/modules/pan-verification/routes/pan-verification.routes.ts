import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { panVerificationController } from '../controller/pan-verification.controller';
import { verifyPanBodySchema } from '../validator/pan-verification.validator';

const panRateLimiter = createRateLimiter({
  max: env.VERIFICATION_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const panVerificationRouter = Router();

panVerificationRouter.use(authenticate);
panVerificationRouter.use(panRateLimiter);

panVerificationRouter.get('/status', asyncHandler(panVerificationController.getStatus));

panVerificationRouter.post(
  '/verify',
  validateRequest(verifyPanBodySchema),
  asyncHandler(panVerificationController.verify),
);
