import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { requirePermission } from '../../common/middleware/require-permission';
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
import { adminJobsRouter } from '../careers';

export const adminRouter = Router();

adminRouter.use(authenticate);

// Destructive wipe — never mount in production.
if (process.env.NODE_ENV !== 'production') {
  adminRouter.post(
    '/dev/clear-orders-emi',
    requirePermission('users.edit'),
    asyncHandler(adminController.clearOrdersAndEmi),
  );
}

// —— Users ——
adminRouter.get('/users', requirePermission('users.view'), asyncHandler(adminController.listUsers));
adminRouter.post('/users', requirePermission('users.create'), asyncHandler(adminController.createUser));
adminRouter.patch('/users/:id', requirePermission('users.edit'), asyncHandler(adminController.updateUser));

adminRouter.get('/kyc', requirePermission('customers.view'), asyncHandler(adminController.listKyc));

adminRouter.get(
  '/users/:id/activity',
  requirePermission('users.view'),
  asyncHandler(adminController.listUserActivity),
);
adminRouter.get(
  '/users/:id/kyc',
  requirePermission('customers.view'),
  asyncHandler(adminController.listUserKyc),
);

adminRouter.get('/orders', requirePermission('orders.view'), asyncHandler(orderController.adminList));

adminRouter.get(
  '/emi-applications',
  requirePermission('emi.view'),
  asyncHandler(emiApplicationController.listForAdmin),
);

adminRouter.get(
  '/emi-applications/:applicationId',
  requirePermission('emi.view'),
  asyncHandler(emiApplicationController.getByIdForAdmin),
);

adminRouter.post(
  '/emi-applications/:applicationId/approve',
  requirePermission('emi.edit'),
  asyncHandler(emiApplicationController.adminApprove),
);

adminRouter.post(
  '/emi-applications/:applicationId/reject',
  requirePermission('emi.edit'),
  asyncHandler(emiApplicationController.adminReject),
);

adminRouter.patch(
  '/emi-applications/:applicationId/terms',
  requirePermission('emi.edit'),
  asyncHandler(emiApplicationController.adminModifyTerms),
);

adminRouter.patch(
  '/orders/:orderId/status',
  requirePermission('orders.edit'),
  validateRequest(adminUpdateOrderStatusSchema),
  asyncHandler(orderController.adminUpdateStatus),
);

adminRouter.get('/loans', requirePermission('emi.view'), asyncHandler(loanController.listForAdmin));
adminRouter.get('/loans/:loanId', requirePermission('emi.view'), asyncHandler(loanController.getForAdmin));
adminRouter.patch(
  '/loans/:loanId',
  requirePermission('emi.edit'),
  validateRequest(adminUpdateLoanSchema),
  asyncHandler(loanController.adminUpdate),
);
adminRouter.get('/emi-payments', requirePermission('emi.view'), asyncHandler(emiPaymentController.listForAdmin));

adminRouter.get('/autopay', requirePermission('emi.view'), asyncHandler(autopayController.listForAdmin));
adminRouter.get('/autopay/:loanId', requirePermission('emi.view'), asyncHandler(autopayController.getForAdmin));
adminRouter.patch(
  '/autopay/:loanId',
  requirePermission('emi.edit'),
  validateRequest(adminUpdateAutopaySchema),
  asyncHandler(autopayController.adminUpdate),
);

adminRouter.get('/notifications', requirePermission('notifications.view'), asyncHandler(notificationController.listForAdmin));
adminRouter.post(
  '/notifications',
  requirePermission('notifications.create'),
  validateRequest(adminCreateNotificationSchema),
  asyncHandler(notificationController.adminCreate),
);
adminRouter.delete(
  '/notifications/:id',
  requirePermission('notifications.delete'),
  asyncHandler(notificationController.adminDelete),
);
adminRouter.patch(
  '/notifications/read-all',
  requirePermission('notifications.edit'),
  asyncHandler(notificationController.adminMarkAllRead),
);
adminRouter.patch(
  '/notifications/:id/read',
  requirePermission('notifications.edit'),
  asyncHandler(notificationController.adminMarkRead),
);

// —— FI cases ——
adminRouter.get('/fi-cases', requirePermission('fi.view'), asyncHandler(adminController.listFiCases));
adminRouter.get('/fi-cases/:fiCaseId', requirePermission('fi.view'), asyncHandler(adminController.getFiCase));
adminRouter.patch('/fi-cases/:fiCaseId', requirePermission('fi.edit'), asyncHandler(adminController.updateFiCase));

// —— Master data ——
for (const collection of [
  'suppliers',
  'dealers',
  'warehouses',
  'brands',
  'branches',
  'pincodes',
  'wholesalers',
  'delivery_partners',
  'delivery_zones',
] as const) {
  adminRouter.get(`/${collection}`, requirePermission('masters.view'), asyncHandler(adminController.listMaster));
  adminRouter.post(`/${collection}`, requirePermission('masters.create'), asyncHandler(adminController.createMaster));
  adminRouter.put(`/${collection}/:id`, requirePermission('masters.edit'), asyncHandler(adminController.updateMaster));
  adminRouter.delete(`/${collection}/:id`, requirePermission('masters.delete'), asyncHandler(adminController.deleteMaster));
}

// —— Careers job openings (Admin Mobile App) ——
adminRouter.use('/jobs', adminJobsRouter);
