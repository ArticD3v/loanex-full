import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { supportController } from '../controller/support.controller';
import { createSupportTicketSchema, ticketIdParamSchema } from '../validator/support.validator';

const limiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many support requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const supportRouter = Router();

supportRouter.use(authenticate);
supportRouter.use(limiter);

supportRouter.post(
  '/',
  validateRequest(createSupportTicketSchema),
  asyncHandler(supportController.create),
);
supportRouter.get('/', asyncHandler(supportController.list));
supportRouter.get(
  '/:ticketId',
  validateRequest(ticketIdParamSchema, 'params'),
  asyncHandler(supportController.getById),
);
