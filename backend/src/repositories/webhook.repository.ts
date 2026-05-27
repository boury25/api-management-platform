import { Prisma, Webhook, WebhookEvent } from '@prisma/client';
import { prisma } from '../config/database';

export class WebhookRepository {
  async findById(id: string) {
    return prisma.webhook.findUnique({ where: { id } });
  }

  async findByProject(projectId: string) {
    return prisma.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { deliveryLogs: true } },
      },
    });
  }

  async findActiveByProjectAndEvent(projectId: string, eventType: WebhookEvent) {
    return prisma.webhook.findMany({
      where: { projectId, eventType, isActive: true },
    });
  }

  async create(data: Prisma.WebhookCreateInput): Promise<Webhook> {
    return prisma.webhook.create({ data });
  }

  async update(id: string, data: Prisma.WebhookUpdateInput): Promise<Webhook> {
    return prisma.webhook.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.webhook.delete({ where: { id } });
  }

  async createDeliveryLog(data: Prisma.WebhookDeliveryLogCreateInput) {
    return prisma.webhookDeliveryLog.create({ data });
  }

  async findDeliveryLogs(webhookId: string, options: { skip: number; take: number }) {
    const where = { webhookId };
    const [logs, total] = await prisma.$transaction([
      prisma.webhookDeliveryLog.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookDeliveryLog.count({ where }),
    ]);
    return { logs, total };
  }
}
