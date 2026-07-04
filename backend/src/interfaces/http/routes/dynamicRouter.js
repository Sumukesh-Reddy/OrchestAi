'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { authenticate } = require('../middleware/authenticate');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');
const { NotFoundError, ValidationError } = require('../../../domain/errors/AppError');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const logger = createLogger('DynamicRouter');

// Separate AJV for request schema validation
const ajv = new Ajv({ allErrors: true, coerceTypes: true });
addFormats(ajv);

/**
 * Helper to convert route path (e.g. /users/:id) to RegExp and extract param names.
 * @param {string} routePath
 * @returns {{regexp: RegExp, paramNames: string[]}}
 */
function compilePath(routePath) {
  const paramNames = [];
  // Convert /users/:id to regex matching anything except slashes
  const pattern = routePath
    .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    })
    // Escape other characters except slashes
    .replace(/\//g, '\\/');

  const regexp = new RegExp(`^${pattern}$`);
  return { regexp, paramNames };
}

/**
 * Match a requested path against list of active routes and extract route params.
 * @param {string} method - HTTP method
 * @param {string} requestedPath - Requested path (e.g., /users/123)
 * @param {Array} activeRoutes - List of active API route definitions
 * @returns {{route: object, params: object}|null}
 */
function matchRoute(method, requestedPath, activeRoutes) {
  // Filter by method first
  const routesForMethod = activeRoutes.filter(
    (r) => r.method.toUpperCase() === method.toUpperCase()
  );

  // 1. Try exact match
  const exactMatch = routesForMethod.find((r) => r.path === requestedPath);
  if (exactMatch) {
    return { route: exactMatch, params: {} };
  }

  // 2. Try parameterized match
  for (const route of routesForMethod) {
    if (route.path.includes(':')) {
      const { regexp, paramNames } = compilePath(route.path);
      const match = requestedPath.match(regexp);
      if (match) {
        const params = {};
        paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        return { route, params };
      }
    }
  }

  return null;
}

function getDynamicRouter() {
  const router = express.Router();
  const container = getContainer();

  const dynamicController = new (require('../controllers/DynamicController'))(container);

  // Intercept all requests to exposed APIs
  router.all('/*', async (req, res, next) => {
    try {
      const method = req.method;
      // Get subpath relative to exposed mount path
      const requestedPath = '/' + (req.params[0] || '');

      logger.debug('Dynamic route lookup', { method, requestedPath });

      // Fetch active routes from cache/repository
      const { apiRouteRepository, cacheAdapter } = container;
      
      let activeRoutes = await cacheAdapter.getValue('routes:active:all');
      if (!activeRoutes) {
        const result = await apiRouteRepository.findAll({ limit: 1000, isActive: true });
        activeRoutes = result.routes;
        // Cache active routes list for 30s
        await cacheAdapter.set('routes:active:all', activeRoutes, 30);
      }

      // Match route
      const matchResult = matchRoute(method, requestedPath, activeRoutes);
      if (!matchResult) {
        throw new NotFoundError(`No exposed API route matches ${method} ${requestedPath}`);
      }

      const { route, params } = matchResult;
      req.apiRoute = route;
      req.params = { ...req.params, ...params }; // Merge route params into request params

      // Add route-specific log context
      logger.debug('Exposed API route matched', { slug: route.slug, path: route.path });

      // Proceed to authentication and execution pipeline
      next();
    } catch (err) {
      next(err);
    }
  });

  // Apply authenticate middleware dynamically based on route config
  router.use(authenticate);

  // Apply route-specific rate limiting and request schema validation
  router.use(async (req, res, next) => {
    try {
      const route = req.apiRoute;

      // 1. Dynamic Rate Limiting
      if (route.rateLimit?.enabled) {
        const limiter = createRateLimiter({
          windowMs: route.rateLimit.windowMs,
          max: route.rateLimit.max,
        });
        return limiter(req, res, next);
      }

      // 2. Request Schema Validation
      if (route.requestSchema) {
        let validate;
        try {
          validate = ajv.compile(route.requestSchema);
        } catch (schemaErr) {
          logger.error('Invalid route request schema compiled', { slug: route.slug, error: schemaErr.message });
          throw new Error('API route request validation schema is invalid');
        }

        const valid = validate(req.body);
        if (!valid) {
          const errors = validate.errors.map((e) => ({
            field: e.instancePath || e.params?.missingProperty || 'root',
            message: e.message,
          }));
          throw new ValidationError('Request validation failed', errors);
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  });

  // Finally, invoke the workflow executor handler
  router.use(dynamicController.handle);

  return router;
}

module.exports = getDynamicRouter;
