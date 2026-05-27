import { getRedisClient } from '../config/redis';
import { prisma } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export class RateLimitService {
  private redis = getRedisClient();

  async checkRateLimit(apiKeyId: string, projectId: string): Promise<RateLimitResult> {
    const rule = await prisma.rateLimitRule.findUnique({ where: { projectId } });

    if (!rule) {
      // No rule = unlimited
      return { allowed: true, limit: -1, remaining: -1, resetAt: new Date() };
    }

    const now = Date.now();
    const minuteKey = `rl:${apiKeyId}:min:${Math.floor(now / 60000)}`;
    const hourKey = `rl:${apiKeyId}:hr:${Math.floor(now / 3600000)}`;
    const dayKey = `rl:${apiKeyId}:day:${Math.floor(now / 86400000)}`;

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60);
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 3600);
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 86400);

    const results = await pipeline.exec();
    if (!results) {
      return { allowed: true, limit: -1, remaining: -1, resetAt: new Date() };
    }

    const minuteCount = results[0]?.[1] as number;
    const hourCount = results[2]?.[1] as number;
    const dayCount = results[4]?.[1] as number;

    // Check per-minute limit
    if (minuteCount > rule.perMinute) {
      const resetAt = new Date(Math.ceil(now / 60000) * 60000);
      return {
        allowed: false,
        limit: rule.perMinute,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now) / 1000),
      };
    }

    // Check per-hour limit
    if (hourCount > rule.perHour) {
      const resetAt = new Date(Math.ceil(now / 3600000) * 3600000);
      return {
        allowed: false,
        limit: rule.perHour,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now) / 1000),
      };
    }

    // Check per-day limit
    if (dayCount > rule.perDay) {
      const resetAt = new Date(Math.ceil(now / 86400000) * 86400000);
      return {
        allowed: false,
        limit: rule.perDay,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now) / 1000),
      };
    }

    return {
      allowed: true,
      limit: rule.perMinute,
      remaining: Math.max(0, rule.perMinute - minuteCount),
      resetAt: new Date(Math.ceil(now / 60000) * 60000),
    };
  }

  async getOrCreateRule(projectId: string) {
    return prisma.rateLimitRule.upsert({
      where: { projectId },
      create: { projectId, perMinute: 60, perHour: 1000, perDay: 10000 },
      update: {},
    });
  }

  async updateRule(
    projectId: string,
    userId: string,
    data: { perMinute?: number; perHour?: number; perDay?: number },
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') throw new NotFoundError('Project');
    }

    return prisma.rateLimitRule.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });
  }

  async deleteRule(projectId: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project');

    await prisma.rateLimitRule.deleteMany({ where: { projectId } });
  }

  async getCurrentUsage(apiKeyId: string) {
    const now = Date.now();
    const minuteKey = `rl:${apiKeyId}:min:${Math.floor(now / 60000)}`;
    const hourKey = `rl:${apiKeyId}:hr:${Math.floor(now / 3600000)}`;
    const dayKey = `rl:${apiKeyId}:day:${Math.floor(now / 86400000)}`;

    const [minute, hour, day] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(hourKey),
      this.redis.get(dayKey),
    ]);

    return {
      perMinute: parseInt(minute || '0'),
      perHour: parseInt(hour || '0'),
      perDay: parseInt(day || '0'),
    };
  }
}
