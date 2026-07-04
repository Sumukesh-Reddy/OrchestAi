'use strict';

const Joi = require('joi');
const { ValidationError } = require('../../../domain/errors/AppError');

class ApiRouteController {
  constructor({ createApiRouteUseCase, updateApiRouteUseCase, deleteApiRouteUseCase,
    getApiRouteUseCase, listApiRoutesUseCase, executeWorkflowUseCase, workflowRepository }) {
    this.create = this.create.bind(this);
    this.list = this.list.bind(this);
    this.getOne = this.getOne.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.test = this.test.bind(this);
    Object.assign(this, { createApiRouteUseCase, updateApiRouteUseCase, deleteApiRouteUseCase,
      getApiRouteUseCase, listApiRoutesUseCase, executeWorkflowUseCase, workflowRepository });
  }

  _routeSchema(required = true) {
    return Joi.object({
      slug: required ? Joi.string().pattern(/^[a-z0-9-]+$/).required() : Joi.string().pattern(/^[a-z0-9-]+$/).optional(),
      method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE')[required ? 'required' : 'optional'](),
      path: Joi.string()[required ? 'required' : 'optional'](),
      description: Joi.string().max(2000).allow('').optional(),
      authStrategy: Joi.string().valid('JWT', 'API_KEY', 'NONE').default('NONE'),
      requiredScopes: Joi.array().items(Joi.string()).default([]),
      rateLimit: Joi.object({ enabled: Joi.boolean(), windowMs: Joi.number(), max: Joi.number() }).optional(),
      requestSchema: Joi.object().optional(),
      requestMapping: Joi.object().optional(),
      workflowId: required ? Joi.string().required() : Joi.string().optional(),
      workflowVersion: Joi.number().optional(),
      cacheConfig: Joi.object({ enabled: Joi.boolean(), ttl: Joi.number(), keyTemplate: Joi.string().allow('').optional() }).optional(),
      responseMapping: Joi.object().optional(),
      tags: Joi.array().items(Joi.string()).default([]),
      isActive: Joi.boolean().optional(),
    });
  }

  async create(req, res, next) {
    try {
      const { error, value } = this._routeSchema(true).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);
      const route = await this.createApiRouteUseCase.execute({ ...value, createdBy: req.user?.userId });
      res.status(201).json({ success: true, data: { route }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, method, tags, search } = req.query;
      const result = await this.listApiRoutesUseCase.execute({
        page: parseInt(page), limit: Math.min(parseInt(limit), 100),
        method, tags: tags ? tags.split(',') : undefined, search, isActive: true,
        createdBy: req.user.userId,
      });
      res.json({ success: true, data: result, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const route = await this.getApiRouteUseCase.execute(req.params.id);
      res.json({ success: true, data: { route }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { error, value } = this._routeSchema(false).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);
      const route = await this.updateApiRouteUseCase.execute(req.params.id, value);
      res.json({ success: true, data: { route }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await this.deleteApiRouteUseCase.execute(req.params.id);
      res.json({ success: true, data: { message: 'Route deleted' }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async test(req, res, next) {
    try {
      const route = await this.getApiRouteUseCase.execute(req.params.id);
      const result = await this.executeWorkflowUseCase.execute({
        workflowId: route.workflowId?._id?.toString() || route.workflowId?.toString(),
        request: { body: req.body || {}, query: req.query, params: req.params, headers: req.headers, method: 'POST', path: '/test' },
        correlationId: req.correlationId,
        userId: req.user?.userId,
        apiRouteId: route._id?.toString(),
        apiRouteSlug: route.slug,
      });
      res.json({ success: true, data: { result, testMode: true }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }
}

module.exports = ApiRouteController;
