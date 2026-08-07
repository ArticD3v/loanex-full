import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { validateRequest } from '../../common/middleware/validate';
import { asyncHandler } from '../../common/utils/async-handler';
import { adminController } from './admin.controller';
import { emiApplicationController } from '../emi-application/controller/emi-application.controller';
import { emiPaymentController } from '../emi-payment/controller/emi-payment.controller';
import { autopayController } from '../autopay/controller/autopay.controller';
import { adminUpdateAutopaySchema } from '../autopay/validator/autopay.validator';
import { loanController } from '../loan/controller/loan.controller';
import { adminUpdateLoanSchema } from '../loan/validator/loan.validator';
import { notificationController } from '../notifications/controller/notification.controller';
import { adminCreateNotificationSchema } from '../notifications/validator/notification.validator';
import { orderController } from '../order/controller/order.controller';
import { adminUpdateOrderStatusSchema } from '../order/validator/order.validator';

export const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.get('/users', asyncHandler(adminController.listUsers));
adminRouter.post('/users', asyncHandler(adminController.createUser));
adminRouter.patch('/users/:id', asyncHandler(adminController.updateUser));

adminRouter.get('/kyc', asyncHandler(adminController.listKyc));

adminRouter.get('/orders', asyncHandler(orderController.adminList));

adminRouter.get(
  '/emi-applications',
  asyncHandler(emiApplicationController.listForAdmin),
);

adminRouter.get(
  '/emi-applications/:applicationId',
  asyncHandler(emiApplicationController.getByIdForAdmin),
);

adminRouter.post(
  '/emi-applications/:applicationId/approve',
  asyncHandler(emiApplicationController.adminApprove),
);

adminRouter.post(
  '/emi-applications/:applicationId/reject',
  asyncHandler(emiApplicationController.adminReject),
);

adminRouter.patch(
  '/emi-applications/:applicationId/terms',
  asyncHandler(emiApplicationController.adminModifyTerms),
);

adminRouter.patch(
  '/orders/:orderId/status',
  validateRequest(adminUpdateOrderStatusSchema),
  asyncHandler(orderController.adminUpdateStatus),
);

adminRouter.get('/loans', asyncHandler(loanController.listForAdmin));
adminRouter.get('/loans/:loanId', asyncHandler(loanController.getForAdmin));
adminRouter.patch(
  '/loans/:loanId',
  validateRequest(adminUpdateLoanSchema),
  asyncHandler(loanController.adminUpdate),
);
adminRouter.get('/emi-payments', asyncHandler(emiPaymentController.listForAdmin));

adminRouter.get('/autopay', asyncHandler(autopayController.listForAdmin));
adminRouter.get('/autopay/:loanId', asyncHandler(autopayController.getForAdmin));
adminRouter.patch(
  '/autopay/:loanId',
  validateRequest(adminUpdateAutopaySchema),
  asyncHandler(autopayController.adminUpdate),
);

adminRouter.get('/notifications', asyncHandler(notificationController.listForAdmin));
adminRouter.post(
  '/notifications',
  validateRequest(adminCreateNotificationSchema),
  asyncHandler(notificationController.adminCreate),
);
adminRouter.delete(
  '/notifications/:id',
  asyncHandler(notificationController.adminDelete),
);

// —— FI cases ——
adminRouter.get('/fi-cases', asyncHandler(adminController.listFiCases));
adminRouter.get('/fi-cases/:fiCaseId', asyncHandler(adminController.getFiCase));
adminRouter.patch('/fi-cases/:fiCaseId', asyncHandler(adminController.updateFiCase));

// —— Master data: suppliers / dealers / warehouses ——
for (const collection of ['suppliers', 'dealers', 'warehouses'] as const) {
  adminRouter.get(`/${collection}`, asyncHandler(adminController.listMaster));
  adminRouter.post(`/${collection}`, asyncHandler(adminController.createMaster));
  adminRouter.put(`/${collection}/:id`, asyncHandler(adminController.updateMaster));
  adminRouter.delete(`/${collection}/:id`, asyncHandler(adminController.deleteMaster));
}
