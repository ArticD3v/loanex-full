import { z } from 'zod';

export const adminUpdateOrderStatusSchema = z.object({
  status: z
    .enum([
      'CONFIRMED',
      'ORDER_CONFIRMED',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ])
    .transform((value) => (value === 'CONFIRMED' ? 'ORDER_CONFIRMED' : value)),
  remarks: z.string().trim().max(500).optional(),
  location: z.string().trim().max(255).optional(),
  courierPartner: z.string().trim().max(120).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
  warehouse: z.string().trim().max(255).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
});

export type AdminUpdateOrderStatusBody = z.infer<typeof adminUpdateOrderStatusSchema>;
