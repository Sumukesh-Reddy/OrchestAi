'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { requireJwt } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorization');

function getWorkflowRoutes() {
  const router = express.Router();
  const container = getContainer();

  const controller = new (require('../controllers/WorkflowController'))(container);

  // Require admin or developer role for managing workflows
  router.use(requireJwt);
  router.use(requireRole('admin', 'developer'));

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getOne);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);
  router.post('/:id/publish', controller.publish);
  router.get('/:id/versions', controller.getVersions);
  router.get('/:id/versions/:version', controller.getVersion);
  router.post('/:id/duplicate', controller.duplicate);

  return router;
}

module.exports = getWorkflowRoutes;
