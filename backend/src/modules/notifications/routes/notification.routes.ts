import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { notificationController } from '../controller/notification.controller';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many notification requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.use(limiter);

notificationRouter.get('/', asyncHandler(notificationController.list));
notificationRouter.patch('/read-all', asyncHandler(notificationController.markAllRead));
notificationRouter.get('/:id', asyncHandler(notificationController.getById));
notificationRouter.patch('/:id/read', asyncHandler(notificationController.markRead));
notificationRouter.delete('/:id', asyncHandler(notificationController.remove));
