import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKey.service';
import { ApiKeyRepository } from '../repositories/apiKey.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { respond } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

const apiKeyService = new ApiKeyService(new ApiKeyRepository(), new ProjectRepository());

export class ApiKeyController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, name, expiresAt } = req.body;
      const result = await apiKeyService.create(
        projectId,
        name,
        req.user!.id,
        expiresAt ? new Date(expiresAt) : undefined,
        req.user!.role,
      );

      // Only show full key on creation
      respond.created(res, {
        ...result.apiKey,
        key: result.rawKey,
        message: 'Store this key safely — it will never be shown again',
      }, 'API key created');
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { page, limit, skip } = parsePagination(req);

      const { keys, total } = await apiKeyService.listByProject(projectId, req.user!.id, {
        skip,
        take: limit,
      }, req.user!.role);

      respond.success(res, keys, 'API keys retrieved', 200, buildPaginationMeta(total, page, limit));
    } catch (error) {
      next(error);
    }
  }

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const apiKey = await apiKeyService.revoke(req.params.keyId, req.user!.id, req.user!.role);
      respond.success(res, apiKey, 'API key revoked');
    } catch (error) {
      next(error);
    }
  }

  async rotate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { expiresAt } = req.body;
      const result = await apiKeyService.rotate(
        req.params.keyId,
        req.user!.id,
        expiresAt ? new Date(expiresAt) : undefined,
        req.user!.role,
      );

      respond.created(res, {
        ...result.apiKey,
        key: result.rawKey,
        message: 'Store this key safely — it will never be shown again',
      }, 'API key rotated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await apiKeyService.delete(req.params.keyId, req.user!.id, req.user!.role);
      respond.noContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const apiKeyController = new ApiKeyController();
