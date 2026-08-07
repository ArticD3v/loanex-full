import { z } from 'zod';
import { indianMobileSchema, otpSchema } from '../../auth/auth.dto';

export { indianMobileSchema, otpSchema };

export const aadhaarNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Enter a valid 12-digit Aadhaar number');

export const sendMobileOtpBodySchema = z.object({
  mobile: indianMobileSchema.optional(),
});

export const verifyMobileOtpBodySchema = z.object({
  otp: otpSchema,
  mobile: indianMobileSchema.optional(),
});

export const sendAadhaarOtpBodySchema = z.object({
  aadhaarNumber: aadhaarNumberSchema,
});

export const verifyAadhaarBodySchema = z.object({
  otp: otpSchema,
});

export type SendMobileOtpBody = z.infer<typeof sendMobileOtpBodySchema>;
export type VerifyMobileOtpBody = z.infer<typeof verifyMobileOtpBodySchema>;
export type SendAadhaarOtpBody = z.infer<typeof sendAadhaarOtpBodySchema>;
export type VerifyAadhaarBody = z.infer<typeof verifyAadhaarBodySchema>;
