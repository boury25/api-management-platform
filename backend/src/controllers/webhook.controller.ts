import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhook.service';
import { WebhookRepository } from '../repositories/webhook.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { respond } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { WebhookEvent } from '@prisma/client';

const webhookService = new WebhookService(new WebhookRepository(), new ProjectRepository());

export class WebhookController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, url, eventType } = req.body;

      const result = await webhookService.create(projectId, req.user!.id, {
        name,
        url,
        eventType: eventType as WebhookEvent,
      });

      respond.created(res, {
        ...result.webhook,
        secret: result.secret,
        message: 'Store this secret safely — it will not be shown again',
      }, 'Webhook created');
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhooks = await webhookService.list(req.params.projectId, req.user!.id);
      respond.success(res, webhooks);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhook = await webhookService.update(req.params.webhookId, req.user!.id, req.body);
      respond.success(res, webhook, 'Webhook updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await webhookService.delete(req.params.webhookId, req.user!.id);
      respond.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async deliveryLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(req);
      const { logs, total } = await webhookService.getDeliveryLogs(
        req.params.webhookId,
        req.user!.id,
        { skip, take: limit },
      );
      respond.success(res, logs, 'Delivery logs retrieved', 200, buildPaginationMeta(total, page, limit));
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
