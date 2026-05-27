import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import apiKeyRoutes from './apiKey.routes';
import gatewayRoutes from './gateway.routes';
import logRoutes from './log.routes';
import rateLimitRoutes from './rateLimit.routes';
import jwtRoutes from './jwt.routes';
import oauthRoutes from './oauth.routes';
import mockRoutes from './mock.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/gateway', gatewayRoutes);
router.use('/logs', logRoutes);
router.use('/rate-limits', rateLimitRoutes);
router.use('/jwt-configs', jwtRoutes);
router.use('/oauth', oauthRoutes);
router.use('/mocks', mockRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
