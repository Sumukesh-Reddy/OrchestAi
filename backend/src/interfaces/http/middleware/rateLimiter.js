'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../../../config/env');

/**
 * Global rate limiter for all routes.
 */
const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      errors: [{ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' }],
      meta: { correlationId: req.correlationId, retryAfter: req.rateLimit?.resetTime },
    });
  },
});

/**
 * Factory to create a per-route rate limiter.
 * @param {object} options - { windowMs, max }
 * @returns {Function} Express middleware
 */
function createRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.path}`,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        errors: [{ code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded for this endpoint' }],
        meta: { correlationId: req.correlationId },
      });
    },
  });
}

/**
 * Stricter rate limiter for auth endpoints.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      errors: [{ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts' }],
      meta: { correlationId: req.correlationId },
    });
  },
});

module.exports = { globalRateLimiter, createRateLimiter, authRateLimiter };
