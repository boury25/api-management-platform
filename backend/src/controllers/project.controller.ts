import { Request, Response, NextFunction } from 'express';
import { ProjectRepository } from '../repositories/project.repository';
import { respond } from '../utils/apiResponse';
import { parsePagination, parseSort, buildPaginationMeta } from '../utils/pagination';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { UserRole, Environment } from '@prisma/client';

const projectRepo = new ProjectRepository();

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, baseUrl, environment, description } = req.body;

      const project = await projectRepo.create({
        name,
        baseUrl,
        environment: environment as Environment,
        description,
        owner: { connect: { id: req.user!.id } },
      });

      respond.created(res, project, 'Project created successfully');
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(req);
      const { field, order } = parseSort(req, ['name', 'createdAt', 'environment']);

      const isAdmin = req.user!.role === UserRole.ADMIN;
      const ownerId = isAdmin ? undefined : req.user!.id;

      const environment = req.query.environment as Environment | undefined;
      const search = req.query.search as string | undefined;

      const { projects, total } = await projectRepo.findAll({
        ownerId,
        skip,
        take: limit,
        environment,
        search,
        sortField: field,
        sortOrder: order,
      });

      respond.success(
        res,
        projects,
        'Projects retrieved',
        200,
        buildPaginationMeta(total, page, limit),
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectRepo.findByIdWithDetails(req.params.projectId);
      if (!project) throw new NotFoundError('Project');

      const isOwner = project.ownerId === req.user!.id;
      const isAdmin = req.user!.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) throw new ForbiddenError();

      respond.success(res, project);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectRepo.findById(req.params.projectId);
      if (!project) throw new NotFoundError('Project');

      const isOwner = project.ownerId === req.user!.id;
      const isAdmin = req.user!.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) throw new ForbiddenError();

      const updated = await projectRepo.update(req.params.projectId, req.body);
      respond.success(res, updated, 'Project updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectRepo.findById(req.params.projectId);
      if (!project) throw new NotFoundError('Project');

      const isOwner = project.ownerId === req.user!.id;
      const isAdmin = req.user!.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) throw new ForbiddenError();

      await projectRepo.delete(req.params.projectId);
      respond.noContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
