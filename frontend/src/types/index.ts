// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: { field: string; message: string }[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DEVELOPER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

export interface Project {
  id: string;
  name: string;
  baseUrl: string;
  environment: Environment;
  description?: string;
  ownerId: string;
  owner?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  _count?: { apiKeys: number; requestLogs: number };
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  projectId: string;
  isRevoked: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Only present on creation/rotation
  key?: string;
}

// ─── Request Logs ─────────────────────────────────────────────────────────────

export interface RequestLog {
  id: string;
  projectId: string;
  apiKeyId?: string;
  apiKey?: { id: string; name: string; keyPrefix: string };
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  errorMessage?: string;
  timestamp: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  errorRate: string;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  byStatusCode: { statusCode: number; _count: { statusCode: number } }[];
  byMethod: { method: string; _count: { method: number } }[];
  topEndpoints: { path: string; method: string; _count: { path: number } }[];
  timeSeriesData: { timestamp: string; statusCode: number; responseTime: number }[];
  topApiKeys: { apiKeyId: string | null; _count: { apiKeyId: number } }[];
}

// ─── Rate Limits ──────────────────────────────────────────────────────────────

export interface RateLimitRule {
  id: string;
  projectId: string;
  perMinute: number;
  perHour: number;
  perDay: number;
  createdAt: string;
  updatedAt: string;
}

// ─── JWT Config ───────────────────────────────────────────────────────────────

export interface JwtConfig {
  id: string;
  projectId: string;
  issuer?: string;
  audience?: string;
  algorithm: string;
  validateExp: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── OAuth Clients ────────────────────────────────────────────────────────────

export interface OAuthClient {
  id: string;
  projectId: string;
  name: string;
  clientId: string;
  clientSecretPrefix: string;
  redirectUrls: string[];
  scopes: string[];
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
  // Only on creation
  clientSecret?: string;
}

// ─── Mock Endpoints ───────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface MockEndpoint {
  id: string;
  projectId: string;
  name: string;
  method: HttpMethod;
  path: string;
  responseBody: unknown;
  statusCode: number;
  delay: number;
  headers?: Record<string, string>;
  isActive: boolean;
  hitCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export type WebhookEvent =
  | 'API_KEY_USED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'GATEWAY_REQUEST_FAILED'
  | 'MOCK_ENDPOINT_CALLED';

export interface Webhook {
  id: string;
  projectId: string;
  name: string;
  url: string;
  eventType: WebhookEvent;
  secretPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { deliveryLogs: number };
  // Only on creation
  secret?: string;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  statusCode?: number;
  response?: string;
  success: boolean;
  attempt: number;
  duration?: number;
  createdAt: string;
}
