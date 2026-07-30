import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // unique token id, ties this JWT to its DB record
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Refresh tokens are stored server-side only as a SHA-256 hash — never
 * in plaintext — so a leaked database backup cannot be replayed as a
 * live session. The raw token only ever exists in the httpOnly cookie
 * on the client and in-memory during the request that issued it.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Converts a JWT expiresIn-style string (e.g. "30d", "15m") into a
 * concrete Date, used when writing the refresh token's expiry to the DB.
 */
export function expiresInToDate(expiresIn: string): Date {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) {
    throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(Date.now() + value * unitMs[unit]);
}
