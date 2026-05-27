import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { encrypt, decrypt } from '../utils/crypto';
import { respond } from '../utils/apiResponse';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export class JwtConfigController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.assertAccess(projectId, req.user!.id, req.user!.role);

      const config = await prisma.jwtConfig.findUnique({ where: { projectId } });
      if (!config) throw new NotFoundError('JWT configuration');

      // Never return the raw secret
      respond.success(res, { ...config, secret: undefined });
    } catch (error) {
      next(error);
    }
  }

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.assertAccess(projectId, req.user!.id, req.user!.role);

      const { issuer, audience, secret, algorithm, validateExp, isActive } = req.body;

      const encryptedSecret = encrypt(secret);

      const config = await prisma.jwtConfig.upsert({
        where: { projectId },
        create: {
          projectId,
          issuer,
          audience,
          secret: encryptedSecret,
          algorithm,
          validateExp: validateExp ?? true,
          isActive: isActive ?? true,
        },
        update: {
          ...(issuer !== undefined && { issuer }),
          ...(audience !== undefined && { audience }),
          ...(secret && { secret: encryptedSecret }),
          ...(algorithm && { algorithm }),
          ...(validateExp !== undefined && { validateExp }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      respond.success(res, { ...config, secret: undefined }, 'JWT configuration saved');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.assertAccess(projectId, req.user!.id, req.user!.role);

      await prisma.jwtConfig.deleteMany({ where: { projectId } });
      respond.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  private async assertAccess(projectId: string, userId: string, role: UserRole): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId && role !== UserRole.ADMIN) throw new ForbiddenError();
  }
}

export const jwtConfigController = new JwtConfigController();
