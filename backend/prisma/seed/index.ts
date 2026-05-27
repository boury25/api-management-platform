import { PrismaClient, UserRole, Environment } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateApiKey, hashApiKey, generateWebhookSecret, hashValue } from '../../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Create Admin User ────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@apiplatform.dev' },
    update: {},
    create: {
      email: 'admin@apiplatform.dev',
      password: adminPassword,
      name: 'Platform Admin',
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // ─── Create Developer User ────────────────────────────────────────────────────
  const devPassword = await bcrypt.hash('Dev@123456', 12);
  const developer = await prisma.user.upsert({
    where: { email: 'dev@apiplatform.dev' },
    update: {},
    create: {
      email: 'dev@apiplatform.dev',
      password: devPassword,
      name: 'John Developer',
      role: UserRole.DEVELOPER,
    },
  });

  console.log('✅ Developer user created:', developer.email);

  // ─── Create Sample Project ────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'E-Commerce API',
      baseUrl: 'https://jsonplaceholder.typicode.com',
      environment: Environment.DEVELOPMENT,
      description: 'Sample e-commerce backend API for testing',
      ownerId: developer.id,
    },
  });

  console.log('✅ Sample project created:', project.name);

  // ─── Create Rate Limit Rule ────────────────────────────────────────────────────
  await prisma.rateLimitRule.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      perMinute: 60,
      perHour: 1000,
      perDay: 10000,
    },
  });

  console.log('✅ Rate limit rule created');

  // ─── Create API Key ───────────────────────────────────────────────────────────
  const { key, prefix } = generateApiKey('dev');
  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.upsert({
    where: { keyHash },
    update: {},
    create: {
      name: 'Default Development Key',
      keyHash,
      keyPrefix: prefix,
      projectId: project.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  console.log('✅ API key created (prefix):', apiKey.keyPrefix);
  console.log('   ⚠️  RAW KEY (save this):', key);

  // ─── Create Mock Endpoints ─────────────────────────────────────────────────────
  const mocks = [
    {
      name: 'Get Users',
      method: 'GET' as const,
      path: '/users',
      responseBody: [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
        { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'user' },
      ],
      statusCode: 200,
    },
    {
      name: 'Get Products',
      method: 'GET' as const,
      path: '/products',
      responseBody: [
        { id: 1, name: 'Laptop Pro', price: 1299.99, stock: 45 },
        { id: 2, name: 'Wireless Mouse', price: 29.99, stock: 200 },
        { id: 3, name: 'USB-C Hub', price: 49.99, stock: 150 },
      ],
      statusCode: 200,
    },
    {
      name: 'Create Order',
      method: 'POST' as const,
      path: '/orders',
      responseBody: {
        id: 'ord_123456',
        status: 'pending',
        total: 1329.98,
        createdAt: '2024-01-01T00:00:00Z',
      },
      statusCode: 201,
      delay: 300,
    },
    {
      name: 'Health Check',
      method: 'GET' as const,
      path: '/health',
      responseBody: { status: 'healthy', version: '1.0.0', timestamp: '{{now}}' },
      statusCode: 200,
    },
  ];

  for (const mock of mocks) {
    await prisma.mockEndpoint.upsert({
      where: { id: `seed-mock-${mock.method}-${mock.path.replace('/', '')}` },
      update: {},
      create: {
        id: `seed-mock-${mock.method}-${mock.path.replace('/', '')}`,
        projectId: project.id,
        ...mock,
        responseBody: mock.responseBody as object,
      },
    });
  }

  console.log('✅ Mock endpoints created:', mocks.length);

  // ─── Create Webhook ───────────────────────────────────────────────────────────
  const { secret: whSecret, prefix: whPrefix } = generateWebhookSecret();
  const whSecretHash = await hashValue(whSecret);

  await prisma.webhook.upsert({
    where: { id: 'seed-webhook-001' },
    update: {},
    create: {
      id: 'seed-webhook-001',
      projectId: project.id,
      name: 'Slack Notifications',
      url: 'https://webhook.site/example-endpoint',
      eventType: 'GATEWAY_REQUEST_FAILED',
      secretHash: whSecretHash,
      secretPrefix: whPrefix,
      isActive: false, // Disabled by default in seed
    },
  });

  console.log('✅ Sample webhook created');

  // ─── Create Sample Request Logs (only on first seed) ────────────────────────
  const existingLogCount = await prisma.requestLog.count({ where: { projectId: project.id } });

  if (existingLogCount === 0) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const paths = ['/users', '/products', '/orders', '/health', '/categories'];
    const statuses = [200, 200, 200, 201, 400, 404, 500, 200, 200, 201];

    for (let i = 0; i < 50; i++) {
      const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      await prisma.requestLog.create({
        data: {
          projectId: project.id,
          apiKeyId: apiKey.id,
          method: methods[Math.floor(Math.random() * methods.length)],
          path: paths[Math.floor(Math.random() * paths.length)],
          statusCode: statuses[Math.floor(Math.random() * statuses.length)],
          responseTime: Math.floor(Math.random() * 500) + 50,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (compatible; SeedClient/1.0)',
          timestamp: date,
        },
      });
    }
    console.log('✅ Sample request logs created: 50');
  } else {
    console.log(`ℹ️  Skipping logs — ${existingLogCount} already exist`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test credentials:');
  console.log('   Admin: admin@apiplatform.dev / Admin@123456');
  console.log('   Dev:   dev@apiplatform.dev  / Dev@123456');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
