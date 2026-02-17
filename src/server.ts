// Server entry point
import { createApp } from './app';
import config from './config';
import { logger } from './utils/logger';
import { closePool } from './config/database';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`${config.name} server started`, {
    port: config.port,
    environment: config.env,
    version: config.version,
  });
});

// Graceful shutdown
const shutdown = (signal: string): void => {
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(() => {
    logger.info('HTTP server closed');

    closePool()
      .then(() => {
        logger.info('Database pool closed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
      });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  shutdown('UNHANDLED_REJECTION');
});

export default server;
