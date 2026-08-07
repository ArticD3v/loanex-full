import { z } from 'zod';

export const panNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN number (e.g. ABCDE1234F)'),
  );

export const panFullNameSchema = z
  .string()
  .trim()
  .min(3, 'Full name must be at least 3 characters')
  .max(100, 'Full name must be at most 100 characters');

export const panDateOfBirthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    return date.getTime() <= todayUtc.getTime();
  }, 'Date of birth cannot be a future date');

export const verifyPanBodySchema = z.object({
  panNumber: panNumberSchema,
  fullName: panFullNameSchema,
  dateOfBirth: panDateOfBirthSchema,
});

export type VerifyPanBody = z.infer<typeof verifyPanBodySchema>;
