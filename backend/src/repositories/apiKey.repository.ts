import { Prisma, ApiKey } from '@prisma/client';
import { prisma } from '../config/database';

export class ApiKeyRepository {
  async findById(id: string) {
    return prisma.apiKey.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, ownerId: true } } },
    });
  }

  async findByHash(keyHash: string) {
    return prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        project: {
          include: {
            rateLimitRule: true,
            jwtConfig: true,
          },
        },
      },
    });
  }

  async findByProject(projectId: string, options: { skip: number; take: number }) {
    const where = { projectId };
    const [keys, total] = await prisma.$transaction([
      prisma.apiKey.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apiKey.count({ where }),
    ]);
    return { keys, total };
  }

  async create(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
    return prisma.apiKey.create({ data });
  }

  async revoke(id: string): Promise<ApiKey> {
    return prisma.apiKey.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.apiKey.delete({ where: { id } });
  }

  async countByProject(projectId: string): Promise<number> {
    return prisma.apiKey.count({ where: { projectId, isRevoked: false } });
  }
}
