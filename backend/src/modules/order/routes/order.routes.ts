import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { orderController } from '../controller/order.controller';

const orderRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many order requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const orderRouter = Router();

orderRouter.get('/admin/list', asyncHandler(orderController.adminList));
orderRouter.get('/admin/:orderId', asyncHandler(orderController.adminGetById));
orderRouter.put('/admin/:orderId/status', asyncHandler(orderController.adminUpdateStatus));

orderRouter.use(authenticate);
orderRouter.use(orderRateLimiter);

orderRouter.get('/', asyncHandler(orderController.list));
orderRouter.get('/current', asyncHandler(orderController.getCurrent));
orderRouter.get('/:orderId/tracking', asyncHandler(orderController.getTracking));
orderRouter.get('/:orderId/receipt', asyncHandler(orderController.getReceipt));
orderRouter.get('/:orderId/invoice', asyncHandler(orderController.getInvoice));
orderRouter.get('/:orderId', asyncHandler(orderController.getById));
