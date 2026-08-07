import { z } from 'zod';

export const adminCreateNotificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  type: z
    .enum([
      'APPLICATION_SUBMITTED',
      'APPLICATION_APPROVED',
      'APPLICATION_REJECTED',
      'OFFER_RECEIVED',
      'OFFER_ACCEPTED',
      'DOWN_PAYMENT_SUCCESS',
      'ORDER_CONFIRMED',
      'ORDER_SHIPPED',
      'ORDER_DELIVERED',
      'EMI_DUE_REMINDER',
      'EMI_OVERDUE',
      'EMI_PAID',
      'EMI_FAILED',
      'AUTOPAY_SUCCESS',
      'AUTOPAY_FAILED',
      'LOAN_CLOSED',
      'SYSTEM',
    ])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
