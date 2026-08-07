import { z } from 'zod';

export const adminUpdateLoanSchema = z.object({
  loanStatus: z.enum(['ACTIVE', 'PAUSED', 'CLOSED']),
  remarks: z.string().trim().max(500).optional(),
});

export type AdminUpdateLoanBody = z.infer<typeof adminUpdateLoanSchema>;
