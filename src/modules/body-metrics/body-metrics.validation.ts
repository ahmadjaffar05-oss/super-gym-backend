import { z } from 'zod';

export const createBodyMetricSchema = z.object({
  memberId: z.string().uuid(),
  weightKg: z.coerce.number().positive().max(500).optional(),
  bodyFatPct: z.coerce.number().min(0).max(100).optional(),
  chestCm: z.coerce.number().positive().max(300).optional(),
  waistCm: z.coerce.number().positive().max(300).optional(),
  hipCm: z.coerce.number().positive().max(300).optional(),
  armCm: z.coerce.number().positive().max(200).optional(),
  legCm: z.coerce.number().positive().max(200).optional(),
  recordedAt: z.coerce.date().optional(),
});

export const listBodyMetricsQuerySchema = z.object({
  memberId: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

export const addProgressPhotoSchema = z.object({
  memberId: z.string().uuid(),
  photoUrl: z.string().url(),
  label: z.string().max(100).optional(),
});

export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>;
export type ListBodyMetricsQuery = z.infer<typeof listBodyMetricsQuerySchema>;
export type AddProgressPhotoInput = z.infer<typeof addProgressPhotoSchema>;
