'use strict';

const express = require('express');
const { getContainer } = require('../../../config/container');
const { requireJwt } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorization');

function getApiRouteRoutes() {
  const router = Router();
  const container = getContainer();

  const controller = new (require('../controllers/ApiRouteController'))(container);

  function Router() {
    return express.Router();
  }

  router.use(requireJwt);
  router.use(requireRole('admin', 'developer'));

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getOne);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);
  router.post('/:id/test', controller.test);

  return router;
}

module.exports = getApiRouteRoutes;
