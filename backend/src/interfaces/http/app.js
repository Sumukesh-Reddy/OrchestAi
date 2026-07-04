'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Config and dependencies
const config = require('../../config/env');
const { getContainer } = require('../../config/container');
const { swaggerUi, getFullSwaggerSpec, serveSwaggerSpec } = require('./swagger');

// Middlewares
const correlationIdMiddleware = require('./middleware/correlationId');
const requestLogger = require('./middleware/requestLogger');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route Factories
const getAuthRoutes = require('./routes/authRoutes');
const getWorkflowRoutes = require('./routes/workflowRoutes');
const getApiRouteRoutes = require('./routes/apiRouteRoutes');
const getApiKeyRoutes = require('./routes/apiKeyRoutes');
const getLogRoutes = require('./routes/logRoutes');
const getAiRoutes = require('./routes/aiRoutes');
const getSystemRoutes = require('./routes/systemRoutes');
const getDynamicRouter = require('./routes/dynamicRouter');

function createApp() {
  const app = express();

  // Basic security and efficiency middlewares
  app.use(helmet());
  app.use(cors({
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request correlation & logging
  app.use(correlationIdMiddleware);
  app.use(requestLogger);

  // Global prometheus metrics hook
  app.use(metricsMiddleware);

  // Global rate limiter
  app.use(globalRateLimiter);

  // Serve static assets / public directory if needed
  // app.use(express.static('public'));

  // Mounting system routes (health check, live, ready, metrics)
  app.use('/', getSystemRoutes());
  app.use('/api/v1', getSystemRoutes());

  // Mounting Swagger UI docs
  app.get('/swagger.json', serveSwaggerSpec);
  app.use('/docs', swaggerUi.serve, async (req, res, next) => {
    try {
      const spec = await getFullSwaggerSpec();
      swaggerUi.setup(spec)(req, res, next);
    } catch (err) {
      next(err);
    }
  });

  // Admin APIs (Orchestrator configuration, logs, AI)
  app.use('/api/v1/auth', getAuthRoutes());
  app.use('/api/v1/workflows', getWorkflowRoutes());
  app.use('/api/v1/routes', getApiRouteRoutes());
  app.use('/api/v1/keys', getApiKeyRoutes());
  app.use('/api/v1/logs', getLogRoutes());
  app.use('/api/v1/ai', getAiRoutes());

  // User Exposed APIs (intercepts dynamic endpoints)
  app.use('/api/v1/exposed', getDynamicRouter());

  // 404 handler
  app.use((req, res, next) => {
    const { NotFoundError } = require('../../domain/errors/AppError');
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
