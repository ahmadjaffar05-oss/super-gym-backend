import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/** Applied globally to every request. */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooManyRequests()),
});

/**
 * Stricter limiter for auth endpoints (login, refresh) — the primary
 * target for credential-stuffing and brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, _res, next) => next(ApiError.tooManyRequests('Too many attempts, please try again later')),
});
