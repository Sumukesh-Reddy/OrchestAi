'use strict';

/**
 * Base application error class.
 * All custom errors extend this to allow instanceof checks and proper HTTP mapping.
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {boolean} isOperational
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request — invalid input data.
 */
class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {Array<{field: string, message: string}>} [fieldErrors]
   */
  constructor(message = 'Validation failed', fieldErrors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fieldErrors = fieldErrors;
  }
}

/**
 * 401 Unauthorized — missing or invalid credentials.
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 403 Forbidden — authenticated but insufficient permissions.
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 404 Not Found — resource does not exist.
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict — resource already exists or state conflict.
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 429 Too Many Requests.
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 500 Internal Error — workflow execution failure.
 */
class WorkflowExecutionError extends AppError {
  /**
   * @param {string} message
   * @param {object} [executionDetails]
   */
  constructor(message = 'Workflow execution failed', executionDetails = {}) {
    super(message, 500, 'WORKFLOW_EXECUTION_ERROR');
    this.executionDetails = executionDetails;
  }
}

/**
 * 502 Bad Gateway — upstream/downstream service failure.
 */
class ExternalServiceError extends AppError {
  constructor(message = 'External service error') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * 503 Service Unavailable.
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  WorkflowExecutionError,
  ExternalServiceError,
  ServiceUnavailableError,
};
