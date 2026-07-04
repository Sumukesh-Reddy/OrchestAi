'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { requireJwt } = require('../middleware/authenticate');
const { authRateLimiter } = require('../middleware/rateLimiter');

function getAuthRoutes() {
  const router = express.Router();
  const container = getContainer();

  const controller = new (require('../controllers/AuthController'))(container);

  router.post('/register', authRateLimiter, controller.register);
  router.post('/verify', authRateLimiter, controller.verify);
  router.post('/login', authRateLimiter, controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', requireJwt, controller.logout);
  router.get('/me', requireJwt, controller.me);

  return router;
}

module.exports = getAuthRoutes;
