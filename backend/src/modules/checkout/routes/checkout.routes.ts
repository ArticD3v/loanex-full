import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { checkoutController } from '../controller/checkout.controller';
import { createCheckoutBodySchema, placeOrderBodySchema } from '../validator/checkout.validator';
import { verifyPaymentBodySchema } from '../../payment/validator/payment.validator';

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

// One-shot COD / DIRECT / EMI-application placement (mobile app).
// Registered before '/:productId' so the literal path is never captured.
checkoutRouter.post(
  '/place-order',
  validateRequest(placeOrderBodySchema),
  asyncHandler(checkoutController.placeOrder),
);

// COD availability for a given cart total (mobile checkout banner).
// Registered before '/:productId' so the literal path is never captured.
checkoutRouter.get('/cod-rules', asyncHandler(checkoutController.getCodRules));

checkoutRouter.get(
  '/session/:sessionId',
  asyncHandler(checkoutController.getSession),
);

// DIRECT (full-payment) checkout — Razorpay order + verification.
checkoutRouter.post(
  '/:sessionId/payment/order',
  asyncHandler(checkoutController.createPaymentOrder),
);
checkoutRouter.post(
  '/:sessionId/payment/verify',
  validateRequest(verifyPaymentBodySchema),
  asyncHandler(checkoutController.verifyPayment),
);
if (env.NODE_ENV !== 'production') {
  checkoutRouter.post(
    '/:sessionId/payment/dev-bypass-signature',
    asyncHandler(checkoutController.createDevBypassSignature),
  );
}

checkoutRouter.get('/:productId', asyncHandler(checkoutController.getSummary));
