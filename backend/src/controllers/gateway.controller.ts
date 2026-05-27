import { Request, Response, NextFunction } from 'express';
import { GatewayService } from '../services/gateway.service';
import { ApiKeyService } from '../services/apiKey.service';
import { RateLimitService } from '../services/rateLimit.service';
import { LogRepository } from '../repositories/log.repository';
import { WebhookService } from '../services/webhook.service';
import { WebhookRepository } from '../repositories/webhook.repository';
import { ApiKeyRepository } from '../repositories/apiKey.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { logger } from '../utils/logger';

const projectRepo = new ProjectRepository();
const apiKeyRepo = new ApiKeyRepository();
const webhookRepo = new WebhookRepository();
const logRepo = new LogRepository();
const webhookService = new WebhookService(webhookRepo, projectRepo);
const apiKeyService = new ApiKeyService(apiKeyRepo, projectRepo);
const rateLimitService = new RateLimitService();
const gatewayService = new GatewayService(apiKeyService, rateLimitService, logRepo, webhookService);

export class GatewayController {
  async proxy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;

      // Express 4 wildcard is at req.params[0] or named '*path'
      const wildcardPath = req.params['path'] || req.params[0] || '';
      const targetPath = wildcardPath.startsWith('/') ? wildcardPath : `/${wildcardPath}`;

      logger.debug(`Gateway: ${req.method} ${targetPath} -> project ${projectId}`);

      const result = await gatewayService.handleRequest(req, projectId, targetPath);

      // Apply response headers (skip hop-by-hop headers)
      const hopByHopHeaders = new Set([
        'content-encoding', 'transfer-encoding', 'connection', 'keep-alive',
        'upgrade', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
      ]);

      for (const [key, value] of Object.entries(result.headers)) {
        if (!hopByHopHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }

      res.setHeader('X-Response-Time', `${result.responseTime}ms`);
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
}

export const gatewayController = new GatewayController();
