import { z } from 'zod';

export const accountHolderNameSchema = z
  .string()
  .trim()
  .min(3, 'Account holder name must be at least 3 characters')
  .max(100, 'Account holder name must be at most 100 characters');

export const bankNameSchema = z
  .string()
  .trim()
  .min(2, 'Bank name is required')
  .max(100, 'Bank name must be at most 100 characters');

export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{8,18}$/, 'Account number must be 8–18 digits');

export const ifscCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code (e.g. SBIN0001234)'),
  );

export const accountTypeSchema = z.enum(['SAVINGS', 'CURRENT']);

export const verifyBankBodySchema = z
  .object({
    accountHolderName: accountHolderNameSchema,
    bankName: bankNameSchema,
    accountNumber: accountNumberSchema,
    confirmAccountNumber: accountNumberSchema,
    ifscCode: ifscCodeSchema,
    accountType: accountTypeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.accountNumber !== data.confirmAccountNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmAccountNumber'],
        message: 'Account number and confirm account number must match',
      });
    }
  });

export type VerifyBankBody = z.infer<typeof verifyBankBodySchema>;

// --- Bank Statement Analysis (temporarily disabled) ---
// export const fetchBankStatementBodySchema = z.object({
//   client_id: z.string().trim().min(1, 'client_id is required'),
// });
// export type FetchBankStatementBody = z.infer<typeof fetchBankStatementBodySchema>;
