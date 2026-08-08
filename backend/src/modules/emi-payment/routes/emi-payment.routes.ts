import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { emiPaymentController } from '../controller/emi-payment.controller';
import {
  createEmiPaymentOrderSchema,
  devBypassEmiPaymentSchema,
  verifyEmiPaymentBodySchema,
} from '../validator/emi-payment.validator';

const emiPaymentRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many EMI payment requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const emiPaymentRouter = Router();

emiPaymentRouter.use(authenticate);
emiPaymentRouter.use(emiPaymentRateLimiter);

emiPaymentRouter.post(
  '/create-order',
  validateRequest(createEmiPaymentOrderSchema),
  asyncHandler(emiPaymentController.createOrder),
);
emiPaymentRouter.post(
  '/verify',
  validateRequest(verifyEmiPaymentBodySchema),
  asyncHandler(emiPaymentController.verify),
);
if (env.NODE_ENV !== 'production') {
  emiPaymentRouter.post(
    '/dev-bypass-signature',
    validateRequest(devBypassEmiPaymentSchema),
    asyncHandler(emiPaymentController.createDevBypassSignature),
  );
}
emiPaymentRouter.get('/:emiId/receipt', asyncHandler(emiPaymentController.getReceipt));
emiPaymentRouter.get('/:emiId', asyncHandler(emiPaymentController.getByEmiId));
