import { Prisma, Project, Environment } from '@prisma/client';
import { prisma } from '../config/database';

export class ProjectRepository {
  async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { apiKeys: true, requestLogs: true } },
      },
    });
  }

  async findByIdWithDetails(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        rateLimitRule: true,
        jwtConfig: {
          select: {
            id: true,
            projectId: true,
            issuer: true,
            audience: true,
            algorithm: true,
            validateExp: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
            mockEndpoints: true,
            webhooks: true,
          },
        },
      },
    });
  }

  async findAll(options: {
    ownerId?: string;
    skip: number;
    take: number;
    environment?: Environment;
    search?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ projects: Project[]; total: number }> {
    const where: Prisma.ProjectWhereInput = {};

    if (options.ownerId) where.ownerId = options.ownerId;
    if (options.environment) where.environment = options.environment;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {
      [options.sortField || 'createdAt']: options.sortOrder || 'desc',
    };

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { apiKeys: true, requestLogs: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total };
  }

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return prisma.project.create({ data });
  }

  async update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async existsByOwner(id: string, ownerId: string): Promise<boolean> {
    const count = await prisma.project.count({ where: { id, ownerId } });
    return count > 0;
  }
}
