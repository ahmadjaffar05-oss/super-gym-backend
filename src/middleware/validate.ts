import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Validates and *replaces* req.body/query/params with the parsed,
 * type-coerced result of the given Zod schemas. Every request that
 * touches user input in this codebase goes through this — it is the
 * single point of protection against malformed payloads, mass
 * assignment, and a large class of injection-style attacks.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      return next();
    } catch (err) {
      const zodError = err as ZodError;
      return next(
        ApiError.badRequest('Validation failed', zodError.flatten?.() ?? zodError.message),
      );
    }
  };
}
