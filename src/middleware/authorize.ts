import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

/**
 * Role-Based Access Control gate. Usage:
 *
 *   router.post('/members', authenticate, authorize('OWNER', 'HEAD_COACH', 'RECEPTIONIST'), createMember);
 *
 * Must run after `authenticate`, which populates `req.user`.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}

/** Convenience guard: OWNER only. */
export const ownerOnly = authorize('OWNER');

/** Convenience guard: any staff role, i.e. everyone except CLIENT. */
export const staffOnly = authorize('OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST', 'ACCOUNTANT');
