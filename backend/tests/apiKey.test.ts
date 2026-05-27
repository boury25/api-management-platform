import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();

let accessToken: string;
let projectId: string;
let apiKeyId: string;

beforeAll(async () => {
  // Setup test user and project
  await prisma.user.deleteMany({ where: { email: 'test-apikey@example.com' } });

  const regRes = await request(app).post('/api/auth/register').send({
    email: 'test-apikey@example.com',
    password: 'TestPass@123',
    name: 'API Key Tester',
  });

  accessToken = regRes.body.data.tokens.accessToken;

  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Key Test Project',
      baseUrl: 'https://api.example.com',
      environment: 'DEVELOPMENT',
    });

  projectId = projRes.body.data.id;
});

afterAll(async () => {
  await prisma.apiKey.deleteMany({ where: { project: { name: 'Key Test Project' } } });
  await prisma.project.deleteMany({ where: { name: 'Key Test Project' } });
  await prisma.user.deleteMany({ where: { email: 'test-apikey@example.com' } });
  await prisma.$disconnect();
});

describe('API Key Management', () => {
  describe('POST /api/api-keys', () => {
    it('should create an API key and return raw key only once', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId, name: 'Test Key' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('key');
      expect(res.body.data.key).toMatch(/^amp_dev_/);
      expect(res.body.data).not.toHaveProperty('keyHash');

      apiKeyId = res.body.data.id;
    });

    it('should create key with expiration', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId, name: 'Expiring Key', expiresAt });

      expect(res.status).toBe(201);
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('should reject invalid project ID', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId: 'invalid-uuid', name: 'Bad Key' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/api-keys/project/:projectId', () => {
    it('should list API keys without exposing hashes', async () => {
      const res = await request(app)
        .get(`/api/api-keys/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((key: Record<string, unknown>) => {
        expect(key).not.toHaveProperty('keyHash');
        expect(key).toHaveProperty('keyPrefix');
      });
    });
  });

  describe('PATCH /api/api-keys/:keyId/revoke', () => {
    it('should revoke an API key', async () => {
      const res = await request(app)
        .patch(`/api/api-keys/${apiKeyId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRevoked).toBe(true);
    });

    it('should not revoke an already revoked key', async () => {
      const res = await request(app)
        .patch(`/api/api-keys/${apiKeyId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/api-keys/:keyId/rotate', () => {
    let rotateKeyId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId, name: 'Rotation Test Key' });
      rotateKeyId = res.body.data.id;
    });

    it('should rotate key and return new raw key', async () => {
      const res = await request(app)
        .post(`/api/api-keys/${rotateKeyId}/rotate`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('key');
      expect(res.body.data.key).toMatch(/^amp_dev_/);
    });
  });
});
