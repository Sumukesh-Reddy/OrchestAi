'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { requireJwt } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorization');

function getLogRoutes() {
  const router = express.Router();
  const container = getContainer();

  const controller = new (require('../controllers/ExecutionLogController'))(container);

  router.use(requireJwt);
  router.use(requireRole('admin', 'developer', 'viewer')); // Viewers can view logs too

  router.get('/', controller.list);
  router.get('/stats', controller.getStats);
  router.get('/:id', controller.getOne);
  router.post('/:id/debug', requireRole('admin', 'developer'), controller.debugLog); // Debugging requires edit roles

  return router;
}

module.exports = getLogRoutes;
