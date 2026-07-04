'use strict';

const express = require('express');
const SystemController = require('../controllers/SystemController');

function getSystemRoutes() {
  const router = express.Router();
  const controller = new SystemController();

  router.get('/health', controller.health);
  router.get('/live', controller.liveness);
  router.get('/ready', controller.readiness);
  router.get('/metrics', controller.metrics);

  return router;
}

module.exports = getSystemRoutes;
