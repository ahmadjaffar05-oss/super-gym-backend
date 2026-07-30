import { z } from 'zod';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password';

export const createMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(6).max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).default('UNSPECIFIED'),
  address: z.string().max(500).optional(),
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  medicalConditions: z.string().max(2000).optional(),
  injuries: z.string().max(2000).optional(),
  assignedCoachId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
});

export const updateMemberSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(6).max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']).optional(),
  heightCm: z.coerce.number().positive().max(300).optional(),
  address: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  medicalConditions: z.string().max(2000).optional(),
  injuries: z.string().max(2000).optional(),
  assignedCoachId: z.string().uuid().nullable().optional(),
});

export const listMembersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED', 'PENDING', 'ALL']).default('ALL'),
  coachId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['joinedAt', 'firstName', 'lastName']).default('joinedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const memberIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const freezeMembershipSchema = z.object({
  freezeDays: z.coerce.number().int().positive().max(365),
});

export const renewMembershipSchema = z.object({
  planId: z.string().uuid(),
  startDate: z.coerce.date().optional(),
  autoRenew: z.boolean().default(false),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type FreezeMembershipInput = z.infer<typeof freezeMembershipSchema>;
export type RenewMembershipInput = z.infer<typeof renewMembershipSchema>;
