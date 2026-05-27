import { HttpMethod } from '@prisma/client';
import { MockRepository } from '../repositories/mock.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';

export class MockService {
  constructor(
    private readonly mockRepo: MockRepository,
    private readonly projectRepo: ProjectRepository,
  ) {}

  async create(
    projectId: string,
    userId: string,
    data: {
      name: string;
      method: HttpMethod;
      path: string;
      responseBody: object;
      statusCode: number;
      delay?: number;
      headers?: object;
    },
  ) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId) throw new ForbiddenError('Access denied');

    return this.mockRepo.create({
      ...data,
      responseBody: data.responseBody as object,
      project: { connect: { id: projectId } },
    });
  }

  async list(projectId: string, userId: string, options: { skip: number; take: number }) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId) throw new ForbiddenError('Access denied');

    return this.mockRepo.findByProject(projectId, options);
  }

  async update(
    endpointId: string,
    userId: string,
    data: Partial<{
      name: string;
      method: HttpMethod;
      path: string;
      responseBody: object;
      statusCode: number;
      delay: number;
      headers: object;
      isActive: boolean;
    }>,
  ) {
    const endpoint = await this.mockRepo.findById(endpointId);
    if (!endpoint) throw new NotFoundError('Mock endpoint');

    const project = await this.projectRepo.findById(endpoint.projectId);
    if (!project || project.ownerId !== userId) throw new ForbiddenError('Access denied');

    return this.mockRepo.update(endpointId, data);
  }

  async delete(endpointId: string, userId: string): Promise<void> {
    const endpoint = await this.mockRepo.findById(endpointId);
    if (!endpoint) throw new NotFoundError('Mock endpoint');

    const project = await this.projectRepo.findById(endpoint.projectId);
    if (!project || project.ownerId !== userId) throw new ForbiddenError('Access denied');

    await this.mockRepo.delete(endpointId);
  }

  /**
   * Handle incoming mock request — called by gateway/mock router
   */
  async handleMockRequest(projectId: string, method: HttpMethod, path: string) {
    const endpoint = await this.mockRepo.findByProjectAndPath(projectId, method, path);

    if (!endpoint) {
      return null;
    }

    // Increment hit count (fire-and-forget)
    this.mockRepo.incrementHitCount(endpoint.id).catch(() => {});

    return endpoint;
  }
}
