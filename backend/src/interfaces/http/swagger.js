'use strict';

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('../../config/env');
const { getContainer } = require('../../config/container');

const baseOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OrchestAI — Low-Code API Orchestration Platform',
      version: '1.0.0',
      description: 'API documentation for Admin configuration and exposed user endpoints.',
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  // Auto-scan route JSDoc comments
  apis: ['./src/interfaces/http/routes/*.js'],
};

// Standard static spec for admin APIs
const adminSpec = swaggerJSDoc(baseOptions);

/**
 * Dynamically generates OpenAPI paths for all user-exposed API routes.
 * @returns {Promise<object>} OpenAPI paths object
 */
async function generateDynamicRoutesSpec() {
  const container = getContainer();
  const { apiRouteRepository, cacheAdapter } = container;

  // Check cache first
  const cachedSpec = await cacheAdapter.getValue('swagger:spec:dynamic');
  if (cachedSpec) return cachedSpec;

  const result = await apiRouteRepository.findAll({ limit: 1000, isActive: true });
  const routes = result.routes;
  const paths = {};

  for (const route of routes) {
    const swaggerPath = `/api/v1/exposed${route.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}')}`;
    
    if (!paths[swaggerPath]) {
      paths[swaggerPath] = {};
    }

    const methodLower = route.method.toLowerCase();
    
    // Extract url path parameters
    const pathParams = [];
    route.path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      pathParams.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    });

    const security = [];
    if (route.authStrategy === 'JWT') {
      security.push({ BearerAuth: [] });
    } else if (route.authStrategy === 'API_KEY') {
      security.push({ ApiKeyAuth: [] });
    }

    paths[swaggerPath][methodLower] = {
      summary: route.description || `Exposed ${route.method} API`,
      description: `Dynamic orchestrator endpoint. Workflow: ${route.workflowId?.name || route.workflowId}`,
      tags: ['Exposed Dynamic APIs', ...(route.tags || [])],
      parameters: pathParams,
      security: security.length > 0 ? security : undefined,
      responses: {
        200: {
          description: 'Successful dynamic execution response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'object' },
                  meta: {
                    type: 'object',
                    properties: {
                      correlationId: { type: 'string' },
                      executionId: { type: 'string' },
                      duration: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Validation or parameter mapping error' },
        401: { description: 'Authentication required' },
        403: { description: 'Forbidden' },
        500: { description: 'Workflow execution failure' },
      },
    };

    // If POST/PUT/PATCH and requestSchema exists, document it
    if (['post', 'put', 'patch'].includes(methodLower) && route.requestSchema) {
      paths[swaggerPath][methodLower].requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: route.requestSchema,
          },
        },
      };
    }
  }

  // Cache for 60s
  await cacheAdapter.set('swagger:spec:dynamic', paths, 60);
  return paths;
}

/**
 * Returns the fully merged Swagger Spec (Admin APIs + Dynamic APIs).
 */
async function getFullSwaggerSpec() {
  const dynamicPaths = await generateDynamicRoutesSpec();
  const mergedSpec = JSON.parse(JSON.stringify(adminSpec));
  
  mergedSpec.paths = {
    ...mergedSpec.paths,
    ...dynamicPaths,
  };

  return mergedSpec;
}

/**
 * Express middleware to serve dynamic swagger spec.
 */
function serveSwaggerSpec(req, res, next) {
  getFullSwaggerSpec()
    .then((spec) => res.json(spec))
    .catch(next);
}

module.exports = {
  swaggerUi,
  serveSwaggerSpec,
  getFullSwaggerSpec,
};
