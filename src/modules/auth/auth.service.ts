import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, verifyPassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newTokenId,
  expiresInToDate,
} from '../../utils/jwt';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { CreateUserInput, LoginInput } from './auth.validation';

interface DeviceContext {
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

async function issueTokenPair(userId: string, role: string, email: string, ctx: DeviceContext): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, role: role as never, email });

  const jti = newTokenId();
  const refreshToken = signRefreshToken({ sub: userId, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: expiresInToDate(env.JWT_REFRESH_EXPIRES_IN),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

export async function login(input: LoginInput, ctx: DeviceContext) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Deliberately identical error for "no such user" and "wrong password"
  // so the endpoint cannot be used to enumerate valid email addresses.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact the gym administrator.');
  }

  const tokens = await issueTokenPair(user.id, user.role, user.email, ctx);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { passwordHash: _omit, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

export async function refresh(rawRefreshToken: string, ctx: DeviceContext): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });

  // Token reuse detection: a refresh token that is well-formed and
  // JWT-valid but is missing/already-revoked in the DB means either the
  // session ended normally on another device, or — more seriously — a
  // stolen token is being replayed after we already rotated it. Either
  // way, the safe response is to revoke the entire session family.
  if (!stored || stored.revokedAt || stored.tokenHash !== tokenHash) {
    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      logger.warn(`Refresh token reuse detected for user ${stored.userId} — all sessions revoked`);
    }
    throw ApiError.unauthorized('Session invalid, please log in again');
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact the gym administrator.');
  }

  // Rotate: revoke the token just used, issue a brand new pair.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(user.id, user.role, user.email, ctx);
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;

  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Token already invalid/expired — nothing to revoke, logout still succeeds.
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

/**
 * Admin-only user provisioning. Only an Owner may create another Owner
 * or Head Coach; this business rule is intentionally enforced here in
 * the service layer (not just the route), since services can also be
 * called from seed scripts or other internal jobs.
 */
export async function createUser(input: CreateUserInput, creatorRole: string) {
  if ((input.role === 'OWNER' || input.role === 'HEAD_COACH') && creatorRole !== 'OWNER') {
    throw ApiError.forbidden('Only the Owner can create Owner or Head Coach accounts');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role,
    },
    select: PUBLIC_USER_SELECT,
  });

  return user;
}
