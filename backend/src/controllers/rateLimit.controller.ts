import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../services/rateLimit.service';
import { respond } from '../utils/apiResponse';

const rateLimitService = new RateLimitService();

export class RateLimitController {
  async getRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await rateLimitService.getOrCreateRule(req.params.projectId);
      respond.success(res, rule);
    } catch (error) {
      next(error);
    }
  }

  async upsertRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { perMinute, perHour, perDay } = req.body;
      const rule = await rateLimitService.updateRule(req.params.projectId, req.user!.id, {
        perMinute,
        perHour,
        perDay,
      });
      respond.success(res, rule, 'Rate limit rule updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await rateLimitService.deleteRule(req.params.projectId, req.user!.id);
      respond.noContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const rateLimitController = new RateLimitController();
