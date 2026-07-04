'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { requireJwt } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorization');

function getAiRoutes() {
  const router = express.Router();
  const container = getContainer();

  const controller = new (require('../controllers/AiController'))(container);

  router.use(requireJwt);
  router.use(requireRole('admin', 'developer'));

  router.post('/generate-workflow', controller.generateWorkflow);
  router.post('/suggest-mappings', controller.suggestMappings);
  router.post('/explain-workflow/:id', controller.explainWorkflow);

  return router;
}

module.exports = getAiRoutes;
