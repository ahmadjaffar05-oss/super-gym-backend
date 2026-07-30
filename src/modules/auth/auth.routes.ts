import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validate';
import { verifyCsrfToken } from '../../middleware/csrf';
import { loginSchema, createUserSchema } from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

// Login authenticates with a JSON body, not a cookie, so it is not
// CSRF-exposed (a forged cross-site request cannot read/set the
// resulting Authorization header). /refresh and /logout, however, act
// on the httpOnly refresh-token cookie the browser attaches
// automatically, so they require the double-submit CSRF check.
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.loginHandler);
router.post('/refresh', authRateLimiter, verifyCsrfToken, authController.refreshHandler);
router.post('/logout', verifyCsrfToken, authController.logoutHandler);
router.get('/me', authenticate, authController.meHandler);

// Only staff with admin rights may provision new accounts.
router.post(
  '/users',
  authenticate,
  authorize('OWNER', 'HEAD_COACH', 'RECEPTIONIST'),
  validate({ body: createUserSchema }),
  authController.createUserHandler,
);

export default router;
