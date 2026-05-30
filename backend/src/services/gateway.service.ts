import axios, { AxiosRequestConfig } from 'axios';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { ApiKeyService } from './apiKey.service';
import { RateLimitService } from './rateLimit.service';
import { LogRepository } from '../repositories/log.repository';
import { WebhookService } from './webhook.service';
import { decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';

export interface GatewayResult {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  error?: string;
}

export class GatewayService {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly rateLimitService: RateLimitService,
    private readonly logRepo: LogRepository,
    private readonly webhookService: WebhookService,
  ) {}

  async handleRequest(req: Request, projectId: string, targetPath: string): Promise<GatewayResult> {
    const startTime = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    // 1. Extract and validate API key
    const rawKey = this.extractApiKey(req);
    if (!rawKey) {
      await this.logRequest({
        projectId,
        apiKeyId: undefined,
        method: req.method,
        path: targetPath,
        statusCode: 401,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        error: 'Missing API key',
      });
      return { statusCode: 401, headers: {}, body: { success: false, message: 'API key required' }, responseTime: Date.now() - startTime };
    }

    const apiKey = await this.apiKeyService.validateApiKey(rawKey);
    if (!apiKey || apiKey.project.id !== projectId) {
      await this.logRequest({
        projectId,
        method: req.method,
        path: targetPath,
        statusCode: 401,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        error: 'Invalid or expired API key',
      });
      return { statusCode: 401, headers: {}, body: { success: false, message: 'Invalid or expired API key' }, responseTime: Date.now() - startTime };
    }

    // 2. Check rate limit
    const rateLimitResult = await this.rateLimitService.checkRateLimit(apiKey.id, projectId);
    if (!rateLimitResult.allowed) {
      // Fire webhook
      await this.webhookService.fireEvent(projectId, 'RATE_LIMIT_EXCEEDED', {
        apiKeyId: apiKey.id,
        apiKeyPrefix: apiKey.keyPrefix,
        path: targetPath,
        method: req.method,
      });

      await this.logRequest({
        projectId,
        apiKeyId: apiKey.id,
        method: req.method,
        path: targetPath,
        statusCode: 429,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        error: 'Rate limit exceeded',
      });

      return {
        statusCode: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)),
          'Retry-After': String(rateLimitResult.retryAfter || 60),
        },
        body: { success: false, message: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        responseTime: Date.now() - startTime,
      };
    }

    // 3. Validate JWT if configured
    const jwtConfig = apiKey.project.jwtConfig;
    if (jwtConfig?.isActive) {
      const jwtError = this.validateJwt(req, jwtConfig);
      if (jwtError) {
        await this.logRequest({
          projectId,
          apiKeyId: apiKey.id,
          method: req.method,
          path: targetPath,
          statusCode: 401,
          responseTime: Date.now() - startTime,
          ip,
          userAgent,
          error: `JWT validation failed: ${jwtError}`,
        });
        return { statusCode: 401, headers: {}, body: { success: false, message: `JWT validation failed: ${jwtError}` }, responseTime: Date.now() - startTime };
      }
    }

    // 4. Forward request to target
    const targetUrl = `${apiKey.project.baseUrl}${targetPath}`;
    let result: GatewayResult;

    try {
      result = await this.proxyRequest(req, targetUrl, startTime);
    } catch (err) {
      const error = err as Error;
      const responseTime = Date.now() - startTime;

      // Fire webhook for failed requests
      await this.webhookService.fireEvent(projectId, 'GATEWAY_REQUEST_FAILED', {
        apiKeyId: apiKey.id,
        path: targetPath,
        method: req.method,
        error: error.message,
      });

      await this.logRequest({
        projectId,
        apiKeyId: apiKey.id,
        method: req.method,
        path: targetPath,
        statusCode: 502,
        responseTime,
        ip,
        userAgent,
        error: error.message,
      });

      return { statusCode: 502, headers: {}, body: { success: false, message: 'Bad Gateway', error: error.message }, responseTime };
    }

    // 5. Log successful request
    await this.logRequest({
      projectId,
      apiKeyId: apiKey.id,
      method: req.method,
      path: targetPath,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      ip,
      userAgent,
    });

    // 6. Fire API key used webhook
    await this.webhookService.fireEvent(projectId, 'API_KEY_USED', {
      apiKeyId: apiKey.id,
      apiKeyPrefix: apiKey.keyPrefix,
      path: targetPath,
      method: req.method,
      statusCode: result.statusCode,
    });

    // Add rate limit headers to response
    result.headers['X-RateLimit-Limit'] = String(rateLimitResult.limit);
    result.headers['X-RateLimit-Remaining'] = String(rateLimitResult.remaining);

    return result;
  }

  private extractApiKey(req: Request): string | null {
    // Header: X-API-Key: <key>
    const headerKey = req.headers['x-api-key'];
    if (headerKey) return Array.isArray(headerKey) ? headerKey[0] : headerKey;

    // Query param: ?apiKey=<key>
    if (req.query.apiKey) return req.query.apiKey as string;

    // Bearer token fallback
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.substring(7);

    return null;
  }

  private validateJwt(req: Request, jwtConfig: {
    secret: string;
    algorithm: string;
    issuer?: string | null;
    audience?: string | null;
    validateExp: boolean;
  }): string | null {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return 'No Bearer token found';

    const token = auth.substring(7);

    try {
      const secret = decrypt(jwtConfig.secret);
      jwt.verify(token, secret, {
        algorithms: [jwtConfig.algorithm as jwt.Algorithm],
        ...(jwtConfig.issuer && { issuer: jwtConfig.issuer }),
        ...(jwtConfig.audience && { audience: jwtConfig.audience }),
        ignoreExpiration: !jwtConfig.validateExp,
      });
      return null;
    } catch (err) {
      const error = err as Error;
      return error.message;
    }
  }

  private async proxyRequest(req: Request, targetUrl: string, startTime: number): Promise<GatewayResult> {
    const axiosConfig: AxiosRequestConfig = {
      method: req.method as AxiosRequestConfig['method'],
      url: targetUrl,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
        'X-Forwarded-For': req.ip,
        'X-Forwarded-Proto': req.protocol,
      },
      data: req.body,
      params: req.query,
      timeout: 30000,
      validateStatus: () => true,
      maxRedirects: 5,
    };

    // Remove headers that should not be forwarded
    delete axiosConfig.headers?.['x-api-key'];
    delete axiosConfig.headers?.['content-length'];

    // Strip conditional request headers so the upstream ALWAYS returns a full
    // 200 response. If these are forwarded and the upstream returns 304, the
    // browser uses whatever body it cached previously — which could be the old
    // garbled compressed bytes from before this fix was deployed.
    delete axiosConfig.headers?.['if-none-match'];
    delete axiosConfig.headers?.['if-modified-since'];
    delete axiosConfig.headers?.['if-match'];
    delete axiosConfig.headers?.['if-unmodified-since'];
    delete axiosConfig.headers?.['if-range'];

    // Force uncompressed responses from upstream.
    // Node's http module can handle gzip but not brotli natively; if we
    // forward the browser's 'accept-encoding: gzip, br' the upstream may
    // return brotli-compressed bytes that arrive as garbled binary data.
    // 'identity' asks for no compression at all, keeping the body clean.
    axiosConfig.headers!['accept-encoding'] = 'identity';

    const response = await axios(axiosConfig);
    const responseTime = Date.now() - startTime;

    // Headers the browser should never cache on a gateway URL — strip them so
    // the browser can't build a conditional (If-None-Match / If-Modified-Since)
    // request against this endpoint in the future.
    const stripResponseHeaders = new Set([
      'etag', 'last-modified', 'cache-control', 'expires', 'pragma',
      // Hop-by-hop headers that must not be forwarded
      'transfer-encoding', 'connection', 'keep-alive', 'upgrade',
      'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
    ]);

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      if (value && !stripResponseHeaders.has(key.toLowerCase())) {
        headers[key] = String(value);
      }
    }
    // Tell the browser not to cache gateway proxy responses at all
    headers['cache-control'] = 'no-store';

    return {
      statusCode: response.status,
      headers,
      body: response.data,
      responseTime,
    };
  }

  private async logRequest(data: {
    projectId: string;
    apiKeyId?: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    ip: string;
    userAgent?: string;
    error?: string;
  }): Promise<void> {
    try {
      await this.logRepo.create({
        project: { connect: { id: data.projectId } },
        ...(data.apiKeyId && { apiKey: { connect: { id: data.apiKeyId } } }),
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        ipAddress: data.ip,
        userAgent: data.userAgent,
        errorMessage: data.error,
      });
    } catch (err) {
      logger.error('Failed to write request log:', err);
    }
  }
}
