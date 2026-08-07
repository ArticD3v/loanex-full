import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  issueType: z.enum([
    'ORDER_ISSUE',
    'EMI_ISSUE',
    'PAYMENT_ISSUE',
    'ACCOUNT_ISSUE',
    'OTHER',
  ]),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  attachment: z.string().trim().max(5000).optional(),
});

export type CreateSupportTicketBody = z.infer<typeof createSupportTicketSchema>;

export const ticketIdParamSchema = z.object({
  ticketId: z.string().trim().min(1),
});

export type TicketIdParam = z.infer<typeof ticketIdParamSchema>;
