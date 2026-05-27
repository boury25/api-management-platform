import apiClient from './axios';
import type {
  ApiResponse,
  AuthResponse,
  User,
  Project,
  ApiKey,
  RequestLog,
  AnalyticsData,
  RateLimitRule,
  JwtConfig,
  OAuthClient,
  MockEndpoint,
  Webhook,
  WebhookDeliveryLog,
  PaginationMeta,
} from '@/types';

// Helper to unwrap ApiResponse
async function call<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (!data.success) throw new Error(data.message);
  return data.data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    call<AuthResponse>(apiClient.post('/api/auth/register', data)),

  login: (data: { email: string; password: string }) =>
    call<AuthResponse>(apiClient.post('/api/auth/login', data)),

  refresh: (refreshToken: string) =>
    call<{ accessToken: string; refreshToken: string; expiresIn: string }>(
      apiClient.post('/api/auth/refresh', { refreshToken }),
    ),

  logout: (refreshToken: string) =>
    call<null>(apiClient.post('/api/auth/logout', { refreshToken })),

  me: () => call<User>(apiClient.get('/api/auth/me')),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    call<null>(apiClient.patch('/api/auth/change-password', data)),
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; environment?: string }) =>
    apiClient.get<ApiResponse<Project[]>>('/api/projects', { params }).then((r) => ({
      data: r.data.data || [],
      meta: r.data.meta as PaginationMeta,
    })),

  getById: (id: string) => call<Project>(apiClient.get(`/api/projects/${id}`)),

  create: (data: Partial<Project>) => call<Project>(apiClient.post('/api/projects', data)),

  update: (id: string, data: Partial<Project>) =>
    call<Project>(apiClient.put(`/api/projects/${id}`, data)),

  delete: (id: string) => apiClient.delete(`/api/projects/${id}`),
};

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeysApi = {
  list: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<ApiResponse<ApiKey[]>>(`/api/api-keys/project/${projectId}`, { params })
      .then((r) => ({ data: r.data.data || [], meta: r.data.meta as PaginationMeta })),

  create: (data: { projectId: string; name: string; expiresAt?: string }) =>
    call<ApiKey & { key: string }>(apiClient.post('/api/api-keys', data)),

  revoke: (keyId: string) => call<ApiKey>(apiClient.patch(`/api/api-keys/${keyId}/revoke`)),

  rotate: (keyId: string, expiresAt?: string) =>
    call<ApiKey & { key: string }>(apiClient.post(`/api/api-keys/${keyId}/rotate`, { expiresAt })),

  delete: (keyId: string) => apiClient.delete(`/api/api-keys/${keyId}`),
};

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const logsApi = {
  list: (
    projectId: string,
    params?: {
      page?: number;
      limit?: number;
      method?: string;
      statusCode?: number;
      startDate?: string;
      endDate?: string;
      path?: string;
    },
  ) =>
    apiClient
      .get<ApiResponse<RequestLog[]>>(`/api/logs/project/${projectId}`, { params })
      .then((r) => ({ data: r.data.data || [], meta: r.data.meta as PaginationMeta })),

  analytics: (projectId: string, params?: { startDate?: string; endDate?: string }) =>
    call<AnalyticsData>(
      apiClient.get(`/api/logs/project/${projectId}/analytics`, { params }),
    ),
};

// ─── Rate Limits ──────────────────────────────────────────────────────────────

export const rateLimitsApi = {
  get: (projectId: string) => call<RateLimitRule>(apiClient.get(`/api/rate-limits/project/${projectId}`)),

  update: (projectId: string, data: { perMinute?: number; perHour?: number; perDay?: number }) =>
    call<RateLimitRule>(apiClient.put(`/api/rate-limits/project/${projectId}`, data)),

  delete: (projectId: string) => apiClient.delete(`/api/rate-limits/project/${projectId}`),
};

// ─── JWT Config ───────────────────────────────────────────────────────────────

export const jwtConfigApi = {
  get: (projectId: string) => call<JwtConfig>(apiClient.get(`/api/jwt-configs/project/${projectId}`)),

  upsert: (
    projectId: string,
    data: { secret: string; algorithm?: string; issuer?: string; audience?: string; validateExp?: boolean },
  ) => call<JwtConfig>(apiClient.put(`/api/jwt-configs/project/${projectId}`, data)),

  delete: (projectId: string) => apiClient.delete(`/api/jwt-configs/project/${projectId}`),
};

// ─── OAuth Clients ────────────────────────────────────────────────────────────

export const oauthApi = {
  list: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<ApiResponse<OAuthClient[]>>(`/api/oauth/project/${projectId}`, { params })
      .then((r) => ({ data: r.data.data || [], meta: r.data.meta as PaginationMeta })),

  create: (projectId: string, data: { name: string; redirectUrls?: string[]; scopes?: string[] }) =>
    call<OAuthClient & { clientSecret: string }>(
      apiClient.post(`/api/oauth/project/${projectId}`, data),
    ),

  revoke: (clientId: string) => call<OAuthClient>(apiClient.patch(`/api/oauth/${clientId}/revoke`)),

  delete: (clientId: string) => apiClient.delete(`/api/oauth/${clientId}`),
};

// ─── Mock Endpoints ───────────────────────────────────────────────────────────

export const mocksApi = {
  list: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<ApiResponse<MockEndpoint[]>>(`/api/mocks/project/${projectId}`, { params })
      .then((r) => ({ data: r.data.data || [], meta: r.data.meta as PaginationMeta })),

  create: (
    projectId: string,
    data: {
      name: string;
      method: string;
      path: string;
      responseBody: unknown;
      statusCode: number;
      delay?: number;
    },
  ) => call<MockEndpoint>(apiClient.post(`/api/mocks/project/${projectId}`, data)),

  update: (endpointId: string, data: Partial<MockEndpoint>) =>
    call<MockEndpoint>(apiClient.put(`/api/mocks/${endpointId}`, data)),

  delete: (endpointId: string) => apiClient.delete(`/api/mocks/${endpointId}`),
};

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const webhooksApi = {
  list: (projectId: string) =>
    call<Webhook[]>(apiClient.get(`/api/webhooks/project/${projectId}`)),

  create: (
    projectId: string,
    data: { name: string; url: string; eventType: string },
  ) => call<Webhook & { secret: string }>(apiClient.post(`/api/webhooks/project/${projectId}`, data)),

  update: (webhookId: string, data: Partial<Webhook>) =>
    call<Webhook>(apiClient.put(`/api/webhooks/${webhookId}`, data)),

  delete: (webhookId: string) => apiClient.delete(`/api/webhooks/${webhookId}`),

  deliveryLogs: (webhookId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<ApiResponse<WebhookDeliveryLog[]>>(`/api/webhooks/${webhookId}/deliveries`, { params })
      .then((r) => ({ data: r.data.data || [], meta: r.data.meta as PaginationMeta })),
};
