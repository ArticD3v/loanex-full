import { z } from 'zod';

export const createEmiPaymentOrderSchema = z.object({
  emiId: z.string().uuid(),
});

export const verifyEmiPaymentBodySchema = z.object({
  emiId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const devBypassEmiPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
});
