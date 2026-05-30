import 'express-async-errors';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId, httpLogger } from './middleware/requestLogger';
import { logger } from './utils/logger';

export function createApp(): Application {
  const app = express();

  // ─── Security Headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: config.env === 'production',
    }),
  );

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.cors.origin.split(','),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400,
    }),
  );

  // ─── Body Parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  // Skip compression for gateway proxy routes — those responses are already
  // forwarded verbatim from the upstream, and re-compressing them can cause
  // Vercel (or any reverse proxy in front) to strip Content-Encoding while
  // leaving the body compressed, resulting in garbled binary data in the client.
  app.use(compression({
    filter: (req, _res) => !req.path.startsWith('/api/gateway'),
  }));

  // ─── Request Infrastructure ───────────────────────────────────────────────────
  app.use(requestId);
  app.use(httpLogger);

  // ─── Global Rate Limiter (prevent DDoS) ──────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down' },
    skip: (req) => req.path.startsWith('/api/gateway'), // Gateway has its own rate limiting
  });
  app.use('/api', globalLimiter);

  // ─── Swagger UI ────────────────────────────────────────────────────────────────
  if (config.swagger.enabled) {
    const swaggerSpec = swaggerJsdoc({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'API Management Platform',
          version: '1.0.0',
          description: 'Production-grade API Management Platform — Postman + Kong dashboard',
          contact: { name: 'API Support', email: 'api@example.com' },
        },
        servers: [{ url: `/api`, description: 'API Server' }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
    });

    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'API Management Platform Docs',
        customCss: '.swagger-ui .topbar { display: none }',
      }),
    );

    // Raw spec endpoint
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

    logger.info(`📚 Swagger docs available at /api/docs`);
  }

  // ─── API Routes ───────────────────────────────────────────────────────────────
  app.use('/api', routes);

  // ─── 404 Handler ──────────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Error Handler (must be last) ────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
