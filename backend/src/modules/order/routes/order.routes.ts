import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { requirePermission } from '../../../common/middleware/require-permission';
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

orderRouter.use(authenticate);
orderRouter.use(orderRateLimiter);

orderRouter.get('/admin/list', requirePermission('orders.view'), asyncHandler(orderController.adminList));
orderRouter.get('/admin/:orderId', requirePermission('orders.view'), asyncHandler(orderController.adminGetById));
orderRouter.put('/admin/:orderId/status', requirePermission('orders.edit'), asyncHandler(orderController.adminUpdateStatus));

orderRouter.get('/', asyncHandler(orderController.list));
orderRouter.get('/current', asyncHandler(orderController.getCurrent));
orderRouter.get('/:orderId/tracking', asyncHandler(orderController.getTracking));
orderRouter.get('/:orderId/receipt', asyncHandler(orderController.getReceipt));
orderRouter.post('/:orderId/cancel', asyncHandler(orderController.cancelOrder));
orderRouter.get('/:orderId/invoice', asyncHandler(orderController.getInvoice));
orderRouter.get('/:orderId', asyncHandler(orderController.getById));
