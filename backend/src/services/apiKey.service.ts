import { ApiKeyRepository } from '../repositories/apiKey.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { generateApiKey, hashApiKey } from '../utils/crypto';
import { NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';
import { Environment, UserRole } from '@prisma/client';

export class ApiKeyService {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly projectRepo: ProjectRepository,
  ) {}

  async create(
    projectId: string,
    name: string,
    userId: string,
    expiresAt?: Date,
    userRole?: UserRole,
  ) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');

    if (project.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not own this project');
    }

    // Map project environment to key prefix label
    const envLabel =
      project.environment === Environment.PRODUCTION
        ? 'live'
        : project.environment === Environment.STAGING
        ? 'stg'
        : 'dev';

    const { key, prefix } = generateApiKey(envLabel);
    const keyHash = hashApiKey(key);

    const apiKey = await this.apiKeyRepo.create({
      name,
      keyHash,
      keyPrefix: prefix,
      project: { connect: { id: projectId } },
      ...(expiresAt && { expiresAt }),
    });

    // Return the raw key ONCE — never stored again
    return { apiKey, rawKey: key };
  }

  async listByProject(projectId: string, userId: string, options: { skip: number; take: number }, userRole?: UserRole) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId && userRole !== UserRole.ADMIN) throw new ForbiddenError('Access denied');

    return this.apiKeyRepo.findByProject(projectId, options);
  }

  async revoke(keyId: string, userId: string, userRole?: UserRole) {
    const apiKey = await this.apiKeyRepo.findById(keyId);
    if (!apiKey) throw new NotFoundError('API Key');
    if (apiKey.project.ownerId !== userId && userRole !== UserRole.ADMIN) throw new ForbiddenError('Access denied');

    if (apiKey.isRevoked) {
      throw new ConflictError('API key is already revoked');
    }

    return this.apiKeyRepo.revoke(keyId);
  }

  async rotate(keyId: string, userId: string, expiresAt?: Date, userRole?: UserRole) {
    const existing = await this.apiKeyRepo.findById(keyId);
    if (!existing) throw new NotFoundError('API Key');
    if (existing.project.ownerId !== userId && userRole !== UserRole.ADMIN) throw new ForbiddenError('Access denied');

    const project = await this.projectRepo.findById(existing.projectId);
    if (!project) throw new NotFoundError('Project');

    const envLabel =
      project.environment === Environment.PRODUCTION
        ? 'live'
        : project.environment === Environment.STAGING
        ? 'stg'
        : 'dev';

    // Revoke old key
    await this.apiKeyRepo.revoke(keyId);

    // Generate new key
    const { key, prefix } = generateApiKey(envLabel);
    const keyHash = hashApiKey(key);

    const newApiKey = await this.apiKeyRepo.create({
      name: `${existing.name} (rotated)`,
      keyHash,
      keyPrefix: prefix,
      project: { connect: { id: existing.projectId } },
      ...(expiresAt && { expiresAt }),
    });

    return { apiKey: newApiKey, rawKey: key };
  }

  async delete(keyId: string, userId: string, userRole?: UserRole): Promise<void> {
    const apiKey = await this.apiKeyRepo.findById(keyId);
    if (!apiKey) throw new NotFoundError('API Key');
    if (apiKey.project.ownerId !== userId && userRole !== UserRole.ADMIN) throw new ForbiddenError('Access denied');

    await this.apiKeyRepo.delete(keyId);
  }

  /**
   * Validate an API key from a request header (used by gateway)
   */
  async validateApiKey(rawKey: string) {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await this.apiKeyRepo.findByHash(keyHash);

    if (!apiKey) return null;
    if (apiKey.isRevoked) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update last used (fire-and-forget)
    this.apiKeyRepo.updateLastUsed(apiKey.id).catch(() => {});

    return apiKey;
  }
}
