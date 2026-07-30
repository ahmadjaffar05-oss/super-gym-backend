import { z } from 'zod';

export const qrCheckInSchema = z.object({
  qrCode: z.string().uuid('Invalid QR code'),
});

export const manualCheckInSchema = z.object({
  memberId: z.string().uuid(),
});

export const checkOutSchema = z.object({
  attendanceId: z.string().uuid(),
});

export const listAttendanceQuerySchema = z.object({
  date: z.coerce.date().optional(),
  memberId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

export type QrCheckInInput = z.infer<typeof qrCheckInSchema>;
export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
