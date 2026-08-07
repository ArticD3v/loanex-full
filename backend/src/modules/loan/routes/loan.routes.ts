import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { loanController } from '../controller/loan.controller';

const loanRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many loan requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const loanRouter = Router();

loanRouter.use(authenticate);
loanRouter.use(loanRateLimiter);

loanRouter.get('/current', asyncHandler(loanController.getCurrent));
loanRouter.get('/dashboard', asyncHandler(loanController.getDashboard));
loanRouter.get('/payment-history', asyncHandler(loanController.getPaymentHistory));
loanRouter.get('/statement', asyncHandler(loanController.getStatement));
loanRouter.get('/agreement', asyncHandler(loanController.getAgreement));
loanRouter.get('/:loanId/emi-schedule', asyncHandler(loanController.getEmiSchedule));
