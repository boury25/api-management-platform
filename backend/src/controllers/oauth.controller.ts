import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { generateOAuthCredentials, hashApiKey } from '../utils/crypto';
import { respond } from '../utils/apiResponse';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

// Fields to return for OAuth clients (never expose secret hash)
const oauthClientSelect = {
  id: true,
  projectId: true,
  name: true,
  clientId: true,
  clientSecretPrefix: true,
  redirectUrls: true,
  scopes: true,
  isRevoked: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class OAuthController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.assertAccess(projectId, req.user!.id, req.user!.role);

      const { name, redirectUrls, scopes } = req.body;
      const { clientId, clientSecret } = generateOAuthCredentials();
      const clientSecretHash = hashApiKey(clientSecret);
      const clientSecretPrefix = clientSecret.substring(0, 12);

      const client = await prisma.oAuthClient.create({
        data: {
          projectId,
          name,
          clientId,
          clientSecretHash,
          clientSecretPrefix,
          redirectUrls: redirectUrls || [],
          scopes: scopes || [],
        },
        select: oauthClientSelect,
      });

      respond.created(res, {
        ...client,
        clientSecret,
        message: 'Store the client secret safely — it will not be shown again',
      }, 'OAuth client created');
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.assertAccess(projectId, req.user!.id, req.user!.role);

      const { page, limit, skip } = parsePagination(req);
      const where = { projectId };

      const [clients, total] = await prisma.$transaction([
        prisma.oAuthClient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: oauthClientSelect,
        }),
        prisma.oAuthClient.count({ where }),
      ]);

      respond.success(res, clients, 'OAuth clients retrieved', 200, buildPaginationMeta(total, page, limit));
    } catch (error) {
      next(error);
    }
  }

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
      if (!client) throw new NotFoundError('OAuth client');

      await this.assertAccess(client.projectId, req.user!.id, req.user!.role);

      const updated = await prisma.oAuthClient.update({
        where: { id: clientId },
        data: { isRevoked: true },
        select: oauthClientSelect,
      });

      respond.success(res, updated, 'OAuth client revoked');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId } = req.params;
      const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
      if (!client) throw new NotFoundError('OAuth client');

      await this.assertAccess(client.projectId, req.user!.id, req.user!.role);
      await prisma.oAuthClient.delete({ where: { id: clientId } });
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

export const oauthController = new OAuthController();
