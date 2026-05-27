import axios from 'axios';
import { WebhookEvent } from '@prisma/client';
import { WebhookRepository } from '../repositories/webhook.repository';
import { ProjectRepository } from '../repositories/project.repository';
import {
  generateWebhookSecret,
  hashValue,
  createHmacSignature,
  compareHash,
} from '../utils/crypto';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class WebhookService {
  constructor(
    private readonly webhookRepo: WebhookRepository,
    private readonly projectRepo: ProjectRepository,
  ) {}

  async create(
    projectId: string,
    userId: string,
    data: { name: string; url: string; eventType: WebhookEvent },
  ) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId) throw new ForbiddenError('Access denied');

    const { secret, prefix } = generateWebhookSecret();
    const secretHash = await hashValue(secret);

    const webhook = await this.webhookRepo.create({
      name: data.name,
      url: data.url,
      eventType: data.eventType,
      secretHash,
      secretPrefix: prefix,
      project: { connect: { id: projectId } },
    });

    // Return secret ONCE
    return { webhook, secret };
  }

  async list(projectId: string, userId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId) throw new ForbiddenError('Access denied');

    return this.webhookRepo.findByProject(projectId);
  }

  async update(
    webhookId: string,
    userId: string,
    data: { name?: string; url?: string; isActive?: boolean },
  ) {
    const webhook = await this.webhookRepo.findById(webhookId);
    if (!webhook) throw new NotFoundError('Webhook');

    const project = await this.projectRepo.findById(webhook.projectId);
    if (!project || project.ownerId !== userId) throw new ForbiddenError('Access denied');

    return this.webhookRepo.update(webhookId, data);
  }

  async delete(webhookId: string, userId: string): Promise<void> {
    const webhook = await this.webhookRepo.findById(webhookId);
    if (!webhook) throw new NotFoundError('Webhook');

    const project = await this.projectRepo.findById(webhook.projectId);
    if (!project || project.ownerId !== userId) throw new ForbiddenError('Access denied');

    await this.webhookRepo.delete(webhookId);
  }

  async getDeliveryLogs(
    webhookId: string,
    userId: string,
    options: { skip: number; take: number },
  ) {
    const webhook = await this.webhookRepo.findById(webhookId);
    if (!webhook) throw new NotFoundError('Webhook');

    const project = await this.projectRepo.findById(webhook.projectId);
    if (!project || project.ownerId !== userId) throw new ForbiddenError('Access denied');

    return this.webhookRepo.findDeliveryLogs(webhookId, options);
  }

  /**
   * Fire webhooks for a given event (called internally by gateway, mock server, etc.)
   */
  async fireEvent(projectId: string, eventType: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.webhookRepo.findActiveByProjectAndEvent(projectId, eventType);

    for (const webhook of webhooks) {
      // Fire and forget — don't block the main request
      this.deliverWebhook(webhook.id, webhook.url, webhook.secretHash, eventType, payload).catch(
        (err: Error) => logger.error('Webhook delivery error:', err.message),
      );
    }
  }

  private async deliverWebhook(
    webhookId: string,
    url: string,
    secretHash: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    // Create HMAC signature using the stored hash (we use hash as signing key)
    const signature = `sha256=${createHmacSignature(body, secretHash)}`;

    const startTime = Date.now();
    let statusCode: number | undefined;
    let responseText: string | undefined;
    let success = false;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'User-Agent': 'APIManagementPlatform/1.0',
        },
        timeout: 10000, // 10s timeout
        validateStatus: () => true, // Don't throw on 4xx/5xx
      });

      statusCode = response.status;
      responseText = String(response.data).substring(0, 1000);
      success = statusCode >= 200 && statusCode < 300;
    } catch (err) {
      const error = err as Error;
      responseText = error.message;
      success = false;
    }

    const duration = Date.now() - startTime;

    await this.webhookRepo.createDeliveryLog({
      webhook: { connect: { id: webhookId } },
      eventType,
      payload: payload as object,
      statusCode,
      response: responseText,
      success,
      duration,
    });
  }
}
