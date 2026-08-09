import { z } from 'zod';

export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

export const addressBodySchema = z.object({
  addressLine1: z.string().trim().min(1, 'House / Flat No. is required').max(120),
  // Optional: single-line address forms (e.g. the mobile app) may not split
  // street/area into a separate line.
  addressLine2: z.string().trim().max(200).optional().default(''),
  landmark: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().min(1, 'State is required').max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().trim().min(1).max(80).default('India'),
});

export const createAddressBodySchema = addressBodySchema.extend({
  isDefault: z.boolean().optional().default(false),
  addressType: z.enum(['SHIPPING', 'BILLING']).optional().default('SHIPPING'),
});

export const updateAddressBodySchema = addressBodySchema.extend({
  isDefault: z.boolean().optional(),
  addressType: z.enum(['SHIPPING', 'BILLING']).optional(),
});

export const addressIdParamSchema = z.object({
  addressId: z.string().trim().min(1, 'Address id is required'),
});

export const updatePersonalBodySchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required').max(100),
    email: z.string().trim().email('Enter a valid email address').max(150),
    dob: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
    gender: genderSchema,
  })
  .superRefine((value, ctx) => {
    const dob = new Date(`${value.dob}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date of birth.',
        path: ['dob'],
      });
      return;
    }

    const today = new Date();
    const age =
      today.getUTCFullYear() -
      dob.getUTCFullYear() -
      (today.getUTCMonth() < dob.getUTCMonth() ||
      (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate())
        ? 1
        : 0);

    if (age < 18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must be at least 18 years old.',
        path: ['dob'],
      });
    }
  });

export const upsertProfileBodySchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required').max(100),
    email: z.string().trim().email('Enter a valid email address').max(150),
    dob: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
    gender: genderSchema,
    address: addressBodySchema,
    billingSameAsShipping: z.boolean().default(true),
    billingAddress: addressBodySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.billingSameAsShipping && !value.billingAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Billing address is required when not same as shipping.',
        path: ['billingAddress'],
      });
    }

    const dob = new Date(`${value.dob}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date of birth.',
        path: ['dob'],
      });
      return;
    }

    const today = new Date();
    const age =
      today.getUTCFullYear() -
      dob.getUTCFullYear() -
      (today.getUTCMonth() < dob.getUTCMonth() ||
      (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate())
        ? 1
        : 0);

    if (age < 18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must be at least 18 years old.',
        path: ['dob'],
      });
    }
  });

export type UpsertProfileBody = z.infer<typeof upsertProfileBodySchema>;
export type AddressBody = z.infer<typeof addressBodySchema>;
export type CreateAddressBody = z.infer<typeof createAddressBodySchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressBodySchema>;
export type AddressIdParam = z.infer<typeof addressIdParamSchema>;
export type UpdatePersonalBody = z.infer<typeof updatePersonalBodySchema>;
