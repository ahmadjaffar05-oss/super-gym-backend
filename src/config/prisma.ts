import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Prisma must be a true singleton in development because `tsx watch`
 * hot-reloads modules on every file save. Without caching the instance
 * on `globalThis`, each reload opens a fresh pool of DB connections
 * until Postgres refuses new ones.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (!env.isProduction) {
  global.__prisma__ = prisma;
}
