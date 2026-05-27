import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface LogFilters {
  projectId: string;
  method?: string;
  statusCode?: number;
  apiKeyId?: string;
  startDate?: Date;
  endDate?: Date;
  path?: string;
}

export class LogRepository {
  async create(data: Prisma.RequestLogCreateInput) {
    return prisma.requestLog.create({ data });
  }

  async findByProject(
    filters: LogFilters,
    options: { skip: number; take: number; sortOrder?: 'asc' | 'desc' },
  ) {
    const where = this.buildWhereClause(filters);

    const [logs, total] = await prisma.$transaction([
      prisma.requestLog.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { timestamp: options.sortOrder || 'desc' },
        include: {
          apiKey: { select: { id: true, name: true, keyPrefix: true } },
        },
      }),
      prisma.requestLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getAnalytics(projectId: string, startDate: Date, endDate: Date) {
    const where: Prisma.RequestLogWhereInput = {
      projectId,
      timestamp: { gte: startDate, lte: endDate },
    };

    const [
      totalRequests,
      successRequests,
      failedRequests,
      avgResponseTime,
      byStatusCode,
      byMethod,
      byPath,
      timeSeriesData,
    ] = await Promise.all([
      // Total requests
      prisma.requestLog.count({ where }),

      // Success (2xx)
      prisma.requestLog.count({
        where: { ...where, statusCode: { gte: 200, lt: 300 } },
      }),

      // Failed (4xx + 5xx)
      prisma.requestLog.count({
        where: { ...where, statusCode: { gte: 400 } },
      }),

      // Average response time
      prisma.requestLog.aggregate({
        where,
        _avg: { responseTime: true },
        _max: { responseTime: true },
        _min: { responseTime: true },
      }),

      // By status code
      prisma.requestLog.groupBy({
        by: ['statusCode'],
        where,
        _count: { statusCode: true },
        orderBy: { _count: { statusCode: 'desc' } },
      }),

      // By method
      prisma.requestLog.groupBy({
        by: ['method'],
        where,
        _count: { method: true },
        orderBy: { _count: { method: 'desc' } },
      }),

      // Top endpoints
      prisma.requestLog.groupBy({
        by: ['path', 'method'],
        where,
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),

      // Time series (raw logs for charting — last 24h)
      prisma.requestLog.findMany({
        where: {
          projectId,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: { timestamp: true, statusCode: true, responseTime: true },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    return {
      totalRequests,
      successRequests,
      failedRequests,
      errorRate: totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) : '0',
      avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
      maxResponseTime: avgResponseTime._max.responseTime || 0,
      minResponseTime: avgResponseTime._min.responseTime || 0,
      byStatusCode,
      byMethod,
      topEndpoints: byPath,
      timeSeriesData,
    };
  }

  async getTopApiKeys(projectId: string, limit = 5) {
    return prisma.requestLog.groupBy({
      by: ['apiKeyId'],
      where: {
        projectId,
        apiKeyId: { not: null },
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _count: { apiKeyId: true },
      orderBy: { _count: { apiKeyId: 'desc' } },
      take: limit,
    });
  }

  private buildWhereClause(filters: LogFilters): Prisma.RequestLogWhereInput {
    const where: Prisma.RequestLogWhereInput = { projectId: filters.projectId };

    if (filters.method) where.method = filters.method;
    if (filters.statusCode) where.statusCode = filters.statusCode;
    if (filters.apiKeyId) where.apiKeyId = filters.apiKeyId;
    if (filters.path) where.path = { contains: filters.path, mode: 'insensitive' };
    if (filters.startDate || filters.endDate) {
      where.timestamp = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    return where;
  }
}
