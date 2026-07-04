'use strict';

const Joi = require('joi');
const { ValidationError } = require('../../../domain/errors/AppError');

class WorkflowController {
  constructor({ createWorkflowUseCase, updateWorkflowUseCase, publishWorkflowUseCase,
    getWorkflowUseCase, listWorkflowsUseCase, deleteWorkflowUseCase,
    duplicateWorkflowUseCase, workflowRepository }) {
    this.create = this.create.bind(this);
    this.list = this.list.bind(this);
    this.getOne = this.getOne.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.publish = this.publish.bind(this);
    this.getVersions = this.getVersions.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.duplicate = this.duplicate.bind(this);
    Object.assign(this, { createWorkflowUseCase, updateWorkflowUseCase, publishWorkflowUseCase,
      getWorkflowUseCase, listWorkflowsUseCase, deleteWorkflowUseCase,
      duplicateWorkflowUseCase, workflowRepository });
  }

  async create(req, res, next) {
    try {
      const { error, value } = Joi.object({
        name: Joi.string().required().max(200),
        description: Joi.string().max(2000).allow('').default(''),
        tags: Joi.array().items(Joi.string()).default([]),
      }).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);
      const workflow = await this.createWorkflowUseCase.execute({ ...value, createdBy: req.user?.userId });
      res.status(201).json({ success: true, data: { workflow }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, status, tags, search } = req.query;
      const result = await this.listWorkflowsUseCase.execute({
        page: parseInt(page), limit: Math.min(parseInt(limit), 100),
        status, tags: tags ? tags.split(',') : undefined, search,
        createdBy: req.user.userId,
      });
      res.json({ success: true, data: result, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const workflow = await this.getWorkflowUseCase.execute({ id: req.params.id });
      res.json({ success: true, data: { workflow }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { error, value } = Joi.object({
        name: Joi.string().max(200).optional(),
        description: Joi.string().max(2000).allow('').optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        draftNodes: Joi.array().optional(),
        draftEdges: Joi.array().optional(),
      }).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);
      const workflow = await this.updateWorkflowUseCase.execute({ id: req.params.id, ...value });
      res.json({ success: true, data: { workflow }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await this.deleteWorkflowUseCase.execute({ id: req.params.id });
      res.json({ success: true, data: { message: 'Workflow deleted' }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async publish(req, res, next) {
    try {
      const { error, value } = Joi.object({
        nodes: Joi.array().required(),
        edges: Joi.array().required(),
        changeLog: Joi.string().max(1000).default(''),
      }).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);
      const workflow = await this.publishWorkflowUseCase.execute({
        id: req.params.id, ...value, userId: req.user?.userId,
      });
      res.json({ success: true, data: { workflow, message: `Published version ${workflow.currentVersion}` }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async getVersions(req, res, next) {
    try {
      const versions = await this.workflowRepository.getVersionsList(req.params.id);
      res.json({ success: true, data: { versions }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async getVersion(req, res, next) {
    try {
      const version = await this.workflowRepository.getVersion(req.params.id, req.params.version);
      res.json({ success: true, data: { version }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async duplicate(req, res, next) {
    try {
      const workflow = await this.duplicateWorkflowUseCase.execute({ id: req.params.id, userId: req.user?.userId });
      res.status(201).json({ success: true, data: { workflow }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }
}

module.exports = WorkflowController;
