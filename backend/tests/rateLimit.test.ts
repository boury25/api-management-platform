import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { getRedisClient } from '../src/config/redis';
import { generateApiKey, hashApiKey } from '../src/utils/crypto';

const app = createApp();

let accessToken: string;
let projectId: string;
let rawApiKey: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'test-ratelimit@example.com' } });

  const regRes = await request(app).post('/api/auth/register').send({
    email: 'test-ratelimit@example.com',
    password: 'TestPass@123',
    name: 'Rate Limit Tester',
  });

  accessToken = regRes.body.data.tokens.accessToken;

  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Rate Limit Project',
      baseUrl: 'https://jsonplaceholder.typicode.com',
      environment: 'DEVELOPMENT',
    });

  projectId = projRes.body.data.id;

  // Create API key
  const keyRes = await request(app)
    .post('/api/api-keys')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ projectId, name: 'Rate Test Key' });

  rawApiKey = keyRes.body.data.key;
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { name: 'Rate Limit Project' } });
  await prisma.user.deleteMany({ where: { email: 'test-ratelimit@example.com' } });
  await prisma.$disconnect();
});

describe('Rate Limiting', () => {
  describe('PUT /api/rate-limits/project/:projectId', () => {
    it('should create rate limit rule', async () => {
      const res = await request(app)
        .put(`/api/rate-limits/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ perMinute: 5, perHour: 100, perDay: 1000 });

      expect(res.status).toBe(200);
      expect(res.body.data.perMinute).toBe(5);
    });

    it('should reject invalid rate limit values', async () => {
      const res = await request(app)
        .put(`/api/rate-limits/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ perMinute: -1 });

      expect(res.status).toBe(400);
    });
  });

  describe('Redis rate limit counter', () => {
    it('should increment counter on gateway request', async () => {
      const redis = getRedisClient();
      const apiKeyHash = hashApiKey(rawApiKey);
      const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: apiKeyHash } });

      if (!apiKey) {
        throw new Error('API key not found in test setup');
      }

      const now = Date.now();
      const minuteKey = `rl:${apiKey.id}:min:${Math.floor(now / 60000)}`;

      // Clear counter
      await redis.del(minuteKey);

      // Make a gateway request (will fail proxy but rate limit still applies)
      await request(app)
        .get(`/api/gateway/${projectId}/todos/1`)
        .set('X-API-Key', rawApiKey);

      const count = await redis.get(minuteKey);
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    });
  });

  describe('GET /api/rate-limits/project/:projectId', () => {
    it('should return current rate limit rule', async () => {
      const res = await request(app)
        .get(`/api/rate-limits/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('perMinute');
      expect(res.body.data).toHaveProperty('perHour');
      expect(res.body.data).toHaveProperty('perDay');
    });
  });
});
