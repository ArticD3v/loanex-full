import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { emiApplicationController } from '../controller/emi-application.controller';
import { createEmiApplicationBodySchema } from '../validator/emi-application.validator';

const emiRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many EMI application requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const emiApplicationRouter = Router();

emiApplicationRouter.use(authenticate);
emiApplicationRouter.use(emiRateLimiter);

emiApplicationRouter.get('/review', asyncHandler(emiApplicationController.getReview));
emiApplicationRouter.get('/current', asyncHandler(emiApplicationController.getCurrent));
emiApplicationRouter.get('/status', asyncHandler(emiApplicationController.getStatus));
emiApplicationRouter.get('/history', asyncHandler(emiApplicationController.getHistory));
emiApplicationRouter.get(
  '/current-offer',
  asyncHandler(emiApplicationController.getCurrentOffer),
);
emiApplicationRouter.post(
  '/accept-offer',
  asyncHandler(emiApplicationController.acceptOffer),
);
emiApplicationRouter.post(
  '/decline-offer',
  asyncHandler(emiApplicationController.declineOffer),
);
if (env.NODE_ENV !== 'production') {
  emiApplicationRouter.post(
    '/dev-approve',
    asyncHandler(emiApplicationController.devApprove),
  );
}
emiApplicationRouter.post(
  '/',
  validateRequest(createEmiApplicationBodySchema),
  asyncHandler(emiApplicationController.create),
);
