'use strict';

require('dotenv').config();

/**
 * Validates that required environment variables are present.
 * Throws an error at startup if any required variable is missing.
 */
const required = [
  'MONGODB_URI',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'GEMINI_API_KEY',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please copy .env.example to .env and fill in the values.'
  );
}

/**
 * Centralized, frozen configuration object.
 * All application config is sourced from here — never directly from process.env.
 */
const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
    apiPrefix: '/api',
    shutdownTimeoutMs: parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 30000,
  },

  database: {
    uri: process.env.MONGODB_URI,
    options: {
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 10,
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    },
    maxRetries: 5,
    retryDelayMs: 2000,
  },

  redis: {
    url: process.env.REDIS_URL,
    maxRetries: 10,
    retryDelayMs: 500,
    connectTimeout: 10000,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'orchestai:',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  },

  auth: {
    saltRounds: parseInt(process.env.API_KEY_SALT_ROUNDS, 10) || 12,
    maxRefreshTokensPerUser: 5,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'onboarding@sumukesh.app',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS, 10) || 8192,
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3001')
      .split(',')
      .map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
    standardHeaders: true,
    legacyHeaders: false,
  },

  bullmq: {
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY, 10) || 5,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  },

  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300,
    swaggerTtl: parseInt(process.env.SWAGGER_CACHE_TTL, 10) || 300,
    routeTtl: parseInt(process.env.ROUTE_CACHE_TTL, 10) || 60,
    nodeCacheCheckPeriod: 120,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: '/api-docs',
  },

  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    path: '/metrics',
    collectDefaultMetrics: true,
  },

  workflow: {
    executionTimeoutMs: parseInt(process.env.WORKFLOW_EXECUTION_TIMEOUT_MS, 10) || 30000,
    maxNodeExecutionMs: parseInt(process.env.NODE_EXECUTION_TIMEOUT_MS, 10) || 10000,
  },
});

module.exports = config;
