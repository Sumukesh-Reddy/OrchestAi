'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { requireJwt } = require('../middleware/authenticate');

function getApiKeyRoutes() {
  const router = express.Router();
  const container = getContainer();

  const controller = new (require('../controllers/ApiKeyController'))(container);

  router.use(requireJwt);

  router.post('/', controller.generate);
  router.get('/', controller.list);
  router.delete('/:id', controller.revoke);

  return router;
}

module.exports = getApiKeyRoutes;
