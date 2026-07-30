import { z } from 'zod';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password';

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Staff/member accounts are provisioned by an admin (Owner/Head Coach/
 * Receptionist), not via public self-registration — this is a private
 * gym management system, not a consumer sign-up flow.
 */
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(6).max(30).optional(),
  role: z.enum(['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST', 'ACCOUNTANT', 'CLIENT']),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
