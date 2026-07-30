import type { CookieOptions, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { env } from '../../config/env';
import * as authService from './auth.service';
import { ApiError } from '../../utils/ApiError';

const REFRESH_COOKIE_NAME = 'super_gym_refresh_token';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  domain: env.isProduction ? env.COOKIE_DOMAIN : undefined,
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days, mirrors JWT_REFRESH_EXPIRES_IN default
};

function deviceContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, deviceContext(req));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const { accessToken, refreshToken } = await authService.refresh(token, deviceContext(req));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(200).json({ success: true, data: { accessToken } });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions, maxAge: undefined });
  res.status(200).json({ success: true, data: null });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
});

export const createUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.createUser(req.body, req.user!.role);
  res.status(201).json({ success: true, data: { user } });
});
