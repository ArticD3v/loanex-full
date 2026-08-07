import { z } from 'zod';

export const createMandateSchema = z.object({
  paymentMethod: z.enum(['UPI_AUTOPAY', 'EMANDATE', 'NACH', 'DEBIT_CARD']),
  bankName: z.string().trim().max(120).optional(),
  upiId: z.string().trim().max(120).optional(),
  maximumDebitAmount: z.coerce.number().positive().optional(),
});

export const adminUpdateAutopaySchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'FAILED', 'CANCELLED', 'EXPIRED']),
  remarks: z.string().trim().max(500).optional(),
});
