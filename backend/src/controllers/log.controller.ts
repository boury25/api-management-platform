import { Request, Response, NextFunction } from 'express';
import { LogRepository } from '../repositories/log.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { respond } from '../utils/apiResponse';
import { parsePagination, parseSort, buildPaginationMeta } from '../utils/pagination';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const logRepo = new LogRepository();
const projectRepo = new ProjectRepository();

export class LogController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const project = await projectRepo.findById(projectId);
      if (!project) throw new NotFoundError('Project');

      const isAdmin = req.user!.role === UserRole.ADMIN;
      if (project.ownerId !== req.user!.id && !isAdmin) throw new ForbiddenError();

      const { page, limit, skip } = parsePagination(req);
      const { order } = parseSort(req, ['timestamp']);

      const filters = {
        projectId,
        method: req.query.method as string | undefined,
        statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
        apiKeyId: req.query.apiKeyId as string | undefined,
        path: req.query.path as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const { logs, total } = await logRepo.findByProject(filters, { skip, take: limit, sortOrder: order });

      respond.success(res, logs, 'Logs retrieved', 200, buildPaginationMeta(total, page, limit));
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const project = await projectRepo.findById(projectId);
      if (!project) throw new NotFoundError('Project');

      const isAdmin = req.user!.role === UserRole.ADMIN;
      if (project.ownerId !== req.user!.id && !isAdmin) throw new ForbiddenError();

      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default

      const analytics = await logRepo.getAnalytics(projectId, startDate, endDate);
      const topKeys = await logRepo.getTopApiKeys(projectId);

      respond.success(res, { ...analytics, topApiKeys: topKeys });
    } catch (error) {
      next(error);
    }
  }
}

export const logController = new LogController();
