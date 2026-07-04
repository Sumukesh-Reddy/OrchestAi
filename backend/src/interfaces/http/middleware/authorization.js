'use strict';

const { AuthorizationError } = require('../../../domain/errors/AppError');

/**
 * Middleware factory: require user to have one of the specified roles.
 * @param {...string} roles
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Role '${req.user.role}' is not authorized. Required: ${roles.join(', ')}`));
    }
    next();
  };
}

/**
 * Middleware factory: require user's API key scopes to include all specified scopes.
 * @param {...string} scopes
 * @returns {Function} Express middleware
 */
function requireScope(...scopes) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    if (!req.user.isApiKey) return next(); // JWT users bypass scope check
    const userScopes = req.user.scopes || [];
    if (scopes.some((s) => !userScopes.includes(s))) {
      return next(new AuthorizationError(`Missing required scopes: ${scopes.join(', ')}`));
    }
    next();
  };
}

module.exports = { requireRole, requireScope };
