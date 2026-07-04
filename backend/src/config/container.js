'use strict';

/**
 * Dependency Injection Container.
 * Wires all instances together without a DI library.
 * All dependencies are initialized lazily and cached.
 */

// Infrastructure
const { getRedisClient } = require('./redis');
const RedisCacheAdapter = require('../infrastructure/cache/RedisCacheAdapter');
const NodeCacheAdapter = require('../infrastructure/cache/NodeCacheAdapter');
const TwoLevelCacheAdapter = require('../infrastructure/cache/TwoLevelCacheAdapter');

// Repositories
const MongoUserRepository = require('../infrastructure/repositories/MongoUserRepository');
const MongoApiKeyRepository = require('../infrastructure/repositories/MongoApiKeyRepository');
const MongoWorkflowRepository = require('../infrastructure/repositories/MongoWorkflowRepository');
const MongoApiRouteRepository = require('../infrastructure/repositories/MongoApiRouteRepository');
const MongoExecutionLogRepository = require('../infrastructure/repositories/MongoExecutionLogRepository');

// Plugin Registry
const { registry, registerAllPlugins } = require('../application/plugins/PluginRegistry');

// Auth Use Cases
const LoginUseCase = require('../application/usecases/auth/LoginUseCase');
const RegisterUseCase = require('../application/usecases/auth/RegisterUseCase');
const RefreshTokenUseCase = require('../application/usecases/auth/RefreshTokenUseCase');
const LogoutUseCase = require('../application/usecases/auth/LogoutUseCase');
const GenerateApiKeyUseCase = require('../application/usecases/auth/GenerateApiKeyUseCase');
const ValidateApiKeyUseCase = require('../application/usecases/auth/ValidateApiKeyUseCase');
const VerifyEmailUseCase = require('../application/usecases/auth/VerifyEmailUseCase');

// Infrastructure email client
const ResendEmailClient = require('../infrastructure/email/ResendEmailClient');

// Auth Strategies
const JwtStrategy = require('../application/usecases/auth/strategies/JwtStrategy');
const ApiKeyStrategy = require('../application/usecases/auth/strategies/ApiKeyStrategy');
const NoneStrategy = require('../application/usecases/auth/strategies/NoneStrategy');

// Workflow Use Cases
const { CreateWorkflowUseCase, UpdateWorkflowUseCase, PublishWorkflowUseCase,
  GetWorkflowUseCase, ListWorkflowsUseCase, DeleteWorkflowUseCase, DuplicateWorkflowUseCase,
} = require('../application/usecases/workflow/WorkflowUseCases');
const ExecuteWorkflowUseCase = require('../application/usecases/workflow/ExecuteWorkflowUseCase');

// API Route Use Cases
const { CreateApiRouteUseCase, UpdateApiRouteUseCase, DeleteApiRouteUseCase,
  GetApiRouteUseCase, ListApiRoutesUseCase, ResolveApiRouteUseCase,
} = require('../application/usecases/apiRoute/ApiRouteUseCases');

// Mappers
const { RequestMapper, ResponseMapper } = require('../application/mappers/Mappers');

// AI
const GeminiClient = require('../infrastructure/ai/GeminiClient');

let container = null;

function buildContainer() {
  if (container) return container;

  // Register all plugins
  registerAllPlugins();

  // Infrastructure
  const redisClient = getRedisClient();
  const redisCacheAdapter = new RedisCacheAdapter(redisClient);
  const nodeCacheAdapter = new NodeCacheAdapter();
  const cacheAdapter = new TwoLevelCacheAdapter(redisCacheAdapter, nodeCacheAdapter);

  // Repositories
  const userRepository = new MongoUserRepository();
  const apiKeyRepository = new MongoApiKeyRepository();
  const workflowRepository = new MongoWorkflowRepository();
  const apiRouteRepository = new MongoApiRouteRepository();
  const executionLogRepository = new MongoExecutionLogRepository();

  // Email Infrastructure
  const resendEmailClient = new ResendEmailClient();

  // Auth Use Cases
  const validateApiKeyUseCase = new ValidateApiKeyUseCase(apiKeyRepository);
  const loginUseCase = new LoginUseCase(userRepository);
  const registerUseCase = new RegisterUseCase(userRepository, resendEmailClient);
  const verifyEmailUseCase = new VerifyEmailUseCase(userRepository);
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository);
  const logoutUseCase = new LogoutUseCase(userRepository);
  const generateApiKeyUseCase = new GenerateApiKeyUseCase(apiKeyRepository);

  // Auth Strategies
  const jwtStrategy = new JwtStrategy();
  const apiKeyStrategy = new ApiKeyStrategy(validateApiKeyUseCase);
  const noneStrategy = new NoneStrategy();

  const strategyMap = {
    JWT: jwtStrategy,
    API_KEY: apiKeyStrategy,
    NONE: noneStrategy,
  };

  // Workflow Use Cases
  const createWorkflowUseCase = new CreateWorkflowUseCase(workflowRepository);
  const updateWorkflowUseCase = new UpdateWorkflowUseCase(workflowRepository);
  const publishWorkflowUseCase = new PublishWorkflowUseCase(workflowRepository);
  const getWorkflowUseCase = new GetWorkflowUseCase(workflowRepository);
  const listWorkflowsUseCase = new ListWorkflowsUseCase(workflowRepository);
  const deleteWorkflowUseCase = new DeleteWorkflowUseCase(workflowRepository);
  const duplicateWorkflowUseCase = new DuplicateWorkflowUseCase(workflowRepository);
  const executeWorkflowUseCase = new ExecuteWorkflowUseCase({
    workflowRepository,
    executionLogRepository,
    pluginRegistry: registry,
  });

  // API Route Use Cases
  const createApiRouteUseCase = new CreateApiRouteUseCase({ apiRouteRepository, workflowRepository, cacheAdapter });
  const updateApiRouteUseCase = new UpdateApiRouteUseCase({ apiRouteRepository, cacheAdapter });
  const deleteApiRouteUseCase = new DeleteApiRouteUseCase({ apiRouteRepository, cacheAdapter });
  const getApiRouteUseCase = new GetApiRouteUseCase(apiRouteRepository);
  const listApiRoutesUseCase = new ListApiRoutesUseCase(apiRouteRepository);
  const resolveApiRouteUseCase = new ResolveApiRouteUseCase({ apiRouteRepository, cacheAdapter });

  // Mappers
  const requestMapper = new RequestMapper();
  const responseMapper = new ResponseMapper();

  // AI
  const geminiClient = new GeminiClient();

  container = {
    // Infrastructure
    cacheAdapter,
    redisCacheAdapter,
    nodeCacheAdapter,
    registry,

    // Repositories
    userRepository,
    apiKeyRepository,
    workflowRepository,
    apiRouteRepository,
    executionLogRepository,

    // Auth
    loginUseCase, registerUseCase, verifyEmailUseCase, refreshTokenUseCase, logoutUseCase,
    generateApiKeyUseCase, validateApiKeyUseCase,
    strategyMap,

    // Workflow
    createWorkflowUseCase, updateWorkflowUseCase, publishWorkflowUseCase,
    getWorkflowUseCase, listWorkflowsUseCase, deleteWorkflowUseCase,
    duplicateWorkflowUseCase, executeWorkflowUseCase,

    // API Routes
    createApiRouteUseCase, updateApiRouteUseCase, deleteApiRouteUseCase,
    getApiRouteUseCase, listApiRoutesUseCase, resolveApiRouteUseCase,

    // Mappers
    requestMapper, responseMapper,

    // AI
    geminiClient,
  };

  return container;
}

module.exports = { buildContainer, getContainer: () => container || buildContainer() };
