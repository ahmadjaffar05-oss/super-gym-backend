import { z } from 'zod';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password';

export const createCoachSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(6).max(30).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.array(z.string().min(1).max(60)).max(20).default([]),
  experienceYears: z.coerce.number().int().min(0).max(60).default(0),
  certificates: z.array(z.string().min(1).max(200)).max(30).optional(),
  workingHours: z
    .record(z.string(), z.object({ start: z.string(), end: z.string() }).nullable())
    .optional(),
  salary: z.coerce.number().nonnegative().optional(),
  isHeadCoach: z.boolean().default(false),
});

export const updateCoachSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(6).max(30).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.array(z.string().min(1).max(60)).max(20).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  certificates: z.array(z.string().min(1).max(200)).optional(),
  workingHours: z
    .record(z.string(), z.object({ start: z.string(), end: z.string() }).nullable())
    .optional(),
  salary: z.coerce.number().nonnegative().optional(),
  isHeadCoach: z.boolean().optional(),
});

export const listCoachesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const coachIdParamSchema = z.object({ id: z.string().uuid() });

export type CreateCoachInput = z.infer<typeof createCoachSchema>;
export type UpdateCoachInput = z.infer<typeof updateCoachSchema>;
export type ListCoachesQuery = z.infer<typeof listCoachesQuerySchema>;
