import { z } from 'zod';

export const verifyPaymentBodySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyPaymentBody = z.infer<typeof verifyPaymentBodySchema>;
