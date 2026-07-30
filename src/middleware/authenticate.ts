import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

/**
 * Requires a valid, non-expired access token in the Authorization header
 * as `Bearer <token>`. On success, attaches a minimal `req.user` for
 * downstream handlers and the RBAC middleware.
 *
 * Access tokens are short-lived (15m default) and stateless by design —
 * we deliberately do NOT hit the database on every request. Revocation
 * happens at the refresh-token layer (see modules/auth) and via
 * `isActive` checks re-validated whenever a new access token is minted.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('Access token expired'));
    }
    return next(ApiError.unauthorized('Invalid access token'));
  }
}
