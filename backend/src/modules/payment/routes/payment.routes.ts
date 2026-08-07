import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { paymentController } from '../controller/payment.controller';
import { verifyPaymentBodySchema } from '../validator/payment.validator';

const paymentRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const paymentRouter = Router();

// Webhook must be public (Razorpay servers) — signature validated in service.
paymentRouter.post('/webhook', asyncHandler(paymentController.webhook));

paymentRouter.use(authenticate);
paymentRouter.use(paymentRateLimiter);

paymentRouter.get('/down-payment', asyncHandler(paymentController.getContext));
paymentRouter.get('/order-confirmation', asyncHandler(paymentController.getOrderConfirmation));
paymentRouter.post('/create-order', asyncHandler(paymentController.createOrder));
paymentRouter.post(
  '/verify',
  validateRequest(verifyPaymentBodySchema),
  asyncHandler(paymentController.verify),
);
paymentRouter.get('/fetch/:paymentId', asyncHandler(paymentController.fetchPayment));
paymentRouter.post('/refund', asyncHandler(paymentController.refund));

if (env.NODE_ENV !== 'production') {
  paymentRouter.post(
    '/dev-bypass-signature',
    asyncHandler(paymentController.createDevBypassSignature),
  );
}

paymentRouter.get('/:applicationId', asyncHandler(paymentController.getByApplicationId));
