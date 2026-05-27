import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();

let accessToken: string;
let projectId: string;
let endpointId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'test-mock@example.com' } });

  const regRes = await request(app).post('/api/auth/register').send({
    email: 'test-mock@example.com',
    password: 'TestPass@123',
    name: 'Mock Tester',
  });

  accessToken = regRes.body.data.tokens.accessToken;

  const projRes = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Mock Test Project',
      baseUrl: 'https://api.example.com',
      environment: 'DEVELOPMENT',
    });

  projectId = projRes.body.data.id;
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { name: 'Mock Test Project' } });
  await prisma.user.deleteMany({ where: { email: 'test-mock@example.com' } });
  await prisma.$disconnect();
});

describe('Mock Server', () => {
  describe('POST /api/mocks/project/:projectId', () => {
    it('should create a mock endpoint', async () => {
      const res = await request(app)
        .post(`/api/mocks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Get Users Mock',
          method: 'GET',
          path: '/users',
          responseBody: [{ id: 1, name: 'Alice' }],
          statusCode: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.path).toBe('/users');
      endpointId = res.body.data.id;
    });

    it('should create mock with delay', async () => {
      const res = await request(app)
        .post(`/api/mocks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Slow Endpoint',
          method: 'POST',
          path: '/slow',
          responseBody: { ok: true },
          statusCode: 201,
          delay: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.delay).toBe(100);
    });

    it('should reject path not starting with /', async () => {
      const res = await request(app)
        .post(`/api/mocks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bad Path',
          method: 'GET',
          path: 'no-slash',
          responseBody: {},
          statusCode: 200,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/mocks/serve/:projectId/*', () => {
    it('should serve mock response', async () => {
      const res = await request(app)
        .get(`/api/mocks/serve/${projectId}/users`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('name', 'Alice');
    });

    it('should return 404 for non-existent mock path', async () => {
      const res = await request(app)
        .get(`/api/mocks/serve/${projectId}/nonexistent`);

      expect(res.status).toBe(404);
    });

    it('should respect method mismatch', async () => {
      const res = await request(app)
        .post(`/api/mocks/serve/${projectId}/users`)
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/mocks/:endpointId', () => {
    it('should update mock endpoint', async () => {
      const res = await request(app)
        .put(`/api/mocks/${endpointId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ statusCode: 202, isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.statusCode).toBe(202);
    });
  });

  describe('DELETE /api/mocks/:endpointId', () => {
    it('should delete mock endpoint', async () => {
      const createRes = await request(app)
        .post(`/api/mocks/project/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Delete Me',
          method: 'DELETE',
          path: '/delete-me',
          responseBody: {},
          statusCode: 200,
        });

      const res = await request(app)
        .delete(`/api/mocks/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });
  });
});
