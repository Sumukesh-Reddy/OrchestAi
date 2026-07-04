'use strict';

const dotenv = require('dotenv');
// Load environment variables early
dotenv.config();

const { connectDatabase, disconnectDatabase } = require('./config/database');
const { closeRedis } = require('./config/redis');
const { buildContainer } = require('./config/container');
const { QueueManager } = require('./infrastructure/queue/QueueManager');
const { logger } = require('./infrastructure/logger/WinstonLogger');
const config = require('./config/env');
const createApp = require('./interfaces/http/app');

async function bootstrap() {
  logger.info('Bootstrapping OrchestAI platform...');

  try {
    // 1. Connect to Database (MongoDB)
    await connectDatabase();

    // 2. Build Dependency injection container and plugins
    const container = buildContainer();

    // 3. Initialize BullMQ Queue Manager (producers and workers)
    const queueManager = QueueManager.getInstance();
    await queueManager.initialize({ pluginRegistry: container.registry });

    // 4. Create Express app
    const app = createApp();

    // 5. Start Server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server successfully listening on port ${config.server.port} in [${config.env}] mode`);
      logger.info(`Swagger documentation available at http://localhost:${config.server.port}/docs`);
      logger.info(`Metrics endpoint available at http://localhost:${config.server.port}/metrics`);
    });

   
    const livenessLogInterval = setInterval(() => {
      logger.info('Server is live and healthy');
    }, 5 * 60 * 1000);

    // 6. Setup Graceful Shutdown
    const shutdown = async (signal) => {
      logger.info(`Received signal: ${signal}. Commencing graceful shutdown...`);
      clearInterval(livenessLogInterval);

      // Set timeout for force close
      const forceCloseTimeout = setTimeout(() => {
        logger.error('Shutdown timed out, forcing exit.');
        process.exit(1);
      }, 10000);

      try {
        // Stop accepting new HTTP requests
        server.close(() => {
          logger.info('HTTP server closed.');
        });

        // Close queue worker and connections
        await queueManager.shutdown();

        // Close Redis connections
        await closeRedis();

        // Close MongoDB connections
        await disconnectDatabase();

        clearTimeout(forceCloseTimeout);
        logger.info('Graceful shutdown completed successfully. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown', { error: err.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Platform bootstrap failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Start application
bootstrap();
