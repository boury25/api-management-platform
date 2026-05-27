import { Prisma, MockEndpoint, HttpMethod } from '@prisma/client';
import { prisma } from '../config/database';

export class MockRepository {
  async findById(id: string) {
    return prisma.mockEndpoint.findUnique({ where: { id } });
  }

  async findByProjectAndPath(projectId: string, method: HttpMethod, path: string) {
    return prisma.mockEndpoint.findFirst({
      where: { projectId, method, path, isActive: true },
    });
  }

  async findByProject(projectId: string, options: { skip: number; take: number }) {
    const where = { projectId };
    const [endpoints, total] = await prisma.$transaction([
      prisma.mockEndpoint.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mockEndpoint.count({ where }),
    ]);
    return { endpoints, total };
  }

  async create(data: Prisma.MockEndpointCreateInput): Promise<MockEndpoint> {
    return prisma.mockEndpoint.create({ data });
  }

  async update(id: string, data: Prisma.MockEndpointUpdateInput): Promise<MockEndpoint> {
    return prisma.mockEndpoint.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.mockEndpoint.delete({ where: { id } });
  }

  async incrementHitCount(id: string): Promise<void> {
    await prisma.mockEndpoint.update({
      where: { id },
      data: { hitCount: { increment: 1 } },
    });
  }
}
