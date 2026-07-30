import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const CSRF_COOKIE_NAME = 'super_gym_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Double-submit-cookie CSRF protection.
 *
 * The `csurf` npm package is deprecated and unmaintained, so this
 * implements the same well-established pattern directly:
 *  1. `issueCsrfToken` sets a readable (non-httpOnly) cookie with a
 *     random token on any response.
 *  2. `verifyCsrfToken` requires state-changing requests (POST/PUT/
 *     PATCH/DELETE) that rely on cookie auth to echo that token back in
 *     an `X-CSRF-Token` header — something a cross-site form or <img>
 *     tag cannot do, since it cannot read cookies from our domain.
 *
 * Combined with `SameSite=Strict` on the refresh-token cookie, this
 * gives defense in depth against CSRF for the two cookie-authenticated
 * endpoints (`/auth/refresh`, `/auth/logout`). All other endpoints use
 * a Bearer access token in the Authorization header, which browsers
 * never attach automatically, so they are not CSRF-exposed at all.
 */
export function issueCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      path: '/',
    });
  }
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyCsrfToken(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(ApiError.forbidden('Invalid or missing CSRF token'));
  }
  return next();
}
