import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { env } from '../config/env';

/** 404 handler — registered after all routes, before the error handler. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Single source of truth for turning any thrown error into a consistent
 * JSON response shape. Never leaks stack traces, SQL, or internal
 * details to the client in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.flatten();
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = mapPrismaErrorToStatus(err.code);
    message = mapPrismaErrorToMessage(err.code);
  } else if (err instanceof Error) {
    message = env.isDevelopment ? err.message : message;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${message}`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${statusCode} ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.isDevelopment && err instanceof Error ? { stack: err.stack } : {}),
  });
}

function mapPrismaErrorToStatus(code: string): number {
  switch (code) {
    case 'P2002': // unique constraint violation
      return 409;
    case 'P2025': // record not found
      return 404;
    case 'P2003': // foreign key constraint failure
      return 400;
    default:
      return 500;
  }
}

function mapPrismaErrorToMessage(code: string): string {
  switch (code) {
    case 'P2002':
      return 'A record with this value already exists';
    case 'P2025':
      return 'Record not found';
    case 'P2003':
      return 'Related record does not exist';
    default:
      return 'Database error';
  }
}
