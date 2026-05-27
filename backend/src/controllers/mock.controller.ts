import { Request, Response, NextFunction } from 'express';
import { MockService } from '../services/mock.service';
import { WebhookService } from '../services/webhook.service';
import { MockRepository } from '../repositories/mock.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { respond } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { NotFoundError } from '../middleware/errorHandler';
import { HttpMethod } from '@prisma/client';

const projectRepo = new ProjectRepository();
const mockRepo = new MockRepository();
const webhookRepo = new WebhookRepository();
const webhookService = new WebhookService(webhookRepo, projectRepo);
const mockService = new MockService(mockRepo, projectRepo);

export class MockController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, method, path, responseBody, statusCode, delay, headers } = req.body;

      const endpoint = await mockService.create(projectId, req.user!.id, {
        name,
        method: method as HttpMethod,
        path,
        responseBody,
        statusCode: parseInt(statusCode) || 200,
        delay: delay || 0,
        headers,
      });

      respond.created(res, endpoint, 'Mock endpoint created');
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { page, limit, skip } = parsePagination(req);

      const { endpoints, total } = await mockService.list(projectId, req.user!.id, {
        skip,
        take: limit,
      });

      respond.success(res, endpoints, 'Mock endpoints retrieved', 200, buildPaginationMeta(total, page, limit));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const endpoint = await mockService.update(req.params.endpointId, req.user!.id, req.body);
      respond.success(res, endpoint, 'Mock endpoint updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await mockService.delete(req.params.endpointId, req.user!.id);
      respond.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Serve mock responses — public endpoint
   * Route: /api/mocks/serve/:projectId/*path
   */
  async serve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      // Extract the wildcard path segment
      const wildcardPath = req.params['path'] || req.params[0] || '';
      const mockPath = wildcardPath.startsWith('/') ? wildcardPath : `/${wildcardPath}`;
      const method = req.method as HttpMethod;

      const endpoint = await mockService.handleMockRequest(projectId, method, mockPath);

      if (!endpoint) {
        throw new NotFoundError(`Mock endpoint ${method} ${mockPath}`);
      }

      // Apply optional delay
      if (endpoint.delay && endpoint.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, endpoint.delay as number));
      }

      // Set custom response headers
      if (endpoint.headers && typeof endpoint.headers === 'object') {
        for (const [key, value] of Object.entries(endpoint.headers as Record<string, string>)) {
          res.setHeader(key, value);
        }
      }

      // Fire webhook (async, non-blocking)
      webhookService.fireEvent(projectId, 'MOCK_ENDPOINT_CALLED', {
        endpointId: endpoint.id,
        method: endpoint.method,
        path: endpoint.path,
        statusCode: endpoint.statusCode,
      }).catch(() => {});

      res.status(endpoint.statusCode).json(endpoint.responseBody);
    } catch (error) {
      next(error);
    }
  }
}

export const mockController = new MockController();
