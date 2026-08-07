import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { emiHistoryController } from '../controller/emi-history.controller';

const historyRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many history requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const emiPaymentHistoryRouter = Router();
emiPaymentHistoryRouter.use(authenticate);
emiPaymentHistoryRouter.use(historyRateLimiter);

emiPaymentHistoryRouter.get('/export', asyncHandler(emiHistoryController.exportHistory));
emiPaymentHistoryRouter.get('/', asyncHandler(emiHistoryController.getHistory));
emiPaymentHistoryRouter.get(
  '/:paymentId/receipt',
  asyncHandler(emiHistoryController.getReceipt),
);
emiPaymentHistoryRouter.get('/:paymentId', asyncHandler(emiHistoryController.getPaymentById));

export const emiStatementRouter = Router();
emiStatementRouter.use(authenticate);
emiStatementRouter.use(historyRateLimiter);

emiStatementRouter.get('/pdf', asyncHandler(emiHistoryController.getStatementPdf));
emiStatementRouter.get('/', asyncHandler(emiHistoryController.getStatement));
