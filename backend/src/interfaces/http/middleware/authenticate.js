'use strict';

const { AuthenticationError } = require('../../../domain/errors/AppError');
const { getContainer } = require('../../../config/container');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('AuthenticateMiddleware');

/**
 * Middleware: dynamically inspects the matched API route and applies the configured auth strategy.
 */
async function authenticate(req, res, next) {
  try {
    const route = req.apiRoute;
    if (!route) {
      // If it's a dashboard/admin route, it should use JWT by default or handle inside individual route declarations
      return next();
    }

    const strategyType = route.authStrategy || 'NONE';
    const container = getContainer();
    const strategy = container.strategyMap[strategyType];

    if (!strategy) {
      logger.error('Invalid auth strategy configured for route', { strategyType, slug: route.slug });
      throw new AuthenticationError('Invalid authentication configuration');
    }

    logger.debug('Applying auth strategy', { strategyType, slug: route.slug });

    let credentials = null;

    if (strategyType === 'JWT') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Bearer token is required');
      }
      credentials = authHeader.substring(7); // Remove 'Bearer '
    } else if (strategyType === 'API_KEY') {
      const apiKeyHeader = req.headers['x-api-key'] || req.query.apiKey;
      if (!apiKeyHeader) {
        throw new AuthenticationError('API Key is required in X-API-Key header or apiKey query parameter');
      }
      credentials = apiKeyHeader;
    }

    // Verify credentials using the chosen strategy
    const userPayload = await strategy.verify(credentials);
    req.user = userPayload;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Standard JWT-only authentication middleware for dashboard/admin routes.
 */
function requireJwt(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Bearer token is required');
    }
    const token = authHeader.substring(7);
    const container = getContainer();
    const strategy = container.strategyMap['JWT'];
    req.user = strategy.verify(token);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, requireJwt };
