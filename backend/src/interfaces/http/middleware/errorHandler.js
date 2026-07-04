'use strict';

const { AppError, AuthenticationError, AuthorizationError, ValidationError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');
const config = require('../../../config/env');

const logger = createLogger('ErrorHandler');

/**
 * Global Express error handler.
 * Must be registered last in the middleware chain.
 */
function errorHandler(err, req, res, next) {
  // Determine HTTP status
  let statusCode = err.statusCode || 500;
  let errors = [];
  let errorCode = err.code || 'INTERNAL_ERROR';

  if (err instanceof ValidationError) {
    statusCode = 400;
    errors = err.fieldErrors && err.fieldErrors.length > 0
      ? err.fieldErrors.map((e) => ({ code: 'VALIDATION_ERROR', message: e.message, field: e.field }))
      : [{ code: 'VALIDATION_ERROR', message: err.message }];
  } else if (err instanceof AppError) {
    errors = [{ code: errorCode, message: err.message }];
  } else if (err.name === 'ValidationError' && err.errors) {
    // Mongoose validation error
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errors = Object.values(err.errors).map((e) => ({
      code: 'VALIDATION_ERROR',
      message: e.message,
      field: e.path,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    errors = [{ code: 'INVALID_ID', message: `Invalid ID format: ${err.value}` }];
  } else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    const field = Object.keys(err.keyValue || {})[0];
    errors = [{ code: 'CONFLICT', message: `Duplicate value for field: ${field}`, field }];
  } else {
    // Unexpected error
    errors = [{ code: 'INTERNAL_ERROR', message: config.isProduction ? 'An unexpected error occurred' : err.message }];

    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      correlationId: req.correlationId,
    });
  }

  // Log operational errors at warn level
  if (err.isOperational && statusCode < 500) {
    logger.warn('Operational error', {
      statusCode,
      errorCode,
      message: err.message,
      path: req.path,
      correlationId: req.correlationId,
    });
  }

  res.status(statusCode).json({
    success: false,
    errors,
    meta: {
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  });
}

module.exports = errorHandler;
