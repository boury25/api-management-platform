import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisClient, closeRedis } from './config/redis';
import { config } from './config';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  // Connect to databases
  await connectDatabase();
  getRedisClient(); // Initialize Redis connection

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port} [${config.env}]`);
    logger.info(`📚 API docs: http://localhost:${config.port}/api/docs`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────────
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await disconnectDatabase();
        await closeRedis();
        logger.info('All connections closed. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timeout. Forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
