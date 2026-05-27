import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();

let accessToken: string;
let projectId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'test-webhook@example.com' } });

  const regRes = await request(app).post('/api/auth/register').send({
    email: 'test-webhook@example.com',
    password: 'TestPass@123',
    name: 'Webhook Tester',
  });

  accessToken = regRes.body.data.tokens.accessToken;

  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Webhook Test Project',
      baseUrl: 'https://api.example.com',
      environment: 'DEVELOPMENT',
    });

  projectId = projRes.body.data.id;
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { name: 'Webhook Test Project' } });
  await prisma.user.deleteMany({ where: { email: 'test-webhook@example.com' } });
  await prisma.$disconnect();
});

describe('Webhooks', () => {
  let webhookId: string;
  let webhookSecret: string;

  describe('POST /api/webhooks/project/:projectId', () => {
    it('should create a webhook and return secret once', async () => {
      const res = await request(app)
        .post(`/api/webhooks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Alert Webhook',
          url: 'https://webhook.site/test-endpoint',
          eventType: 'GATEWAY_REQUEST_FAILED',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('secret');
      expect(res.body.data.secret).toMatch(/^whsec_/);
      expect(res.body.data).not.toHaveProperty('secretHash');

      webhookId = res.body.data.id;
      webhookSecret = res.body.data.secret;
    });

    it('should reject invalid event type', async () => {
      const res = await request(app)
        .post(`/api/webhooks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bad Event',
          url: 'https://example.com/hook',
          eventType: 'INVALID_EVENT',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid URL', async () => {
      const res = await request(app)
        .post(`/api/webhooks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bad URL',
          url: 'not-a-url',
          eventType: 'API_KEY_USED',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/webhooks/project/:projectId', () => {
    it('should list webhooks without exposing secret hash', async () => {
      const res = await request(app)
        .get(`/api/webhooks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((wh: Record<string, unknown>) => {
        expect(wh).not.toHaveProperty('secretHash');
        expect(wh).toHaveProperty('secretPrefix');
      });
    });
  });

  describe('PUT /api/webhooks/:webhookId', () => {
    it('should toggle webhook active status', async () => {
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('GET /api/webhooks/:webhookId/deliveries', () => {
    it('should return delivery logs (empty initially)', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('DELETE /api/webhooks/:webhookId', () => {
    it('should delete a webhook', async () => {
      const createRes = await request(app)
        .post(`/api/webhooks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Delete Me',
          url: 'https://example.com/hook',
          eventType: 'API_KEY_USED',
        });

      const deleteRes = await request(app)
        .delete(`/api/webhooks/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteRes.status).toBe(204);
    });
  });
});
