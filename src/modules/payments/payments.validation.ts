import { z } from 'zod';

export const listPaymentsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'REFUNDED', 'CANCELLED', 'ALL']).default('ALL'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const createPaymentSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']).default('CASH'),
  status: z.enum(['PAID', 'PENDING']).default('PENDING'),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const markPaidSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']).default('CASH'),
});

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
