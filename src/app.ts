import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { issueCsrfToken } from './middleware/csrf';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';

export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (e.g. load balancer/nginx) so req.ip and
  // secure-cookie detection behave correctly behind reverse proxies.
  app.set('trust proxy', 1);

  // --- Security headers -------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // --- CORS ---------------------------------------------------------------
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    }),
  );

  // --- Body & cookie parsing ----------------------------------------------
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // --- HTTP parameter pollution + logging ---------------------------------
  app.use(hpp());
  app.use(
    pinoHttp({
      logger: logger as never,
      autoLogging: env.isDevelopment,
    }),
  );

  // --- Rate limiting & CSRF -------------------------------------------------
  app.use(apiRateLimiter);
  app.use(issueCsrfToken);

  // --- Routes ---------------------------------------------------------------
  app.use('/api/v1', apiRouter);

  // --- 404 + centralized error handling --------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
