'use strict';

const Joi = require('joi');
const { ValidationError } = require('../../../domain/errors/AppError');

class AiController {
  constructor({ geminiClient, workflowRepository }) {
    this.geminiClient = geminiClient;
    this.workflowRepository = workflowRepository;

    this.generateWorkflow = this.generateWorkflow.bind(this);
    this.suggestMappings = this.suggestMappings.bind(this);
    this.explainWorkflow = this.explainWorkflow.bind(this);
  }

  async generateWorkflow(req, res, next) {
    try {
      const { error, value } = Joi.object({
        prompt: Joi.string().required().min(10).max(5000),
      }).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);

      const workflowDefinition = await this.geminiClient.generateWorkflow(value.prompt);

      res.json({
        success: true,
        data: { workflow: workflowDefinition },
        meta: { correlationId: req.correlationId },
      });
    } catch (err) {
      next(err);
    }
  }

  async suggestMappings(req, res, next) {
    try {
      const { error, value } = Joi.object({
        inputSample: Joi.object().required(),
        outputSchema: Joi.object().required(),
      }).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);

      const mappings = await this.geminiClient.suggestMappings(value.inputSample, value.outputSchema);

      res.json({
        success: true,
        data: { mappings },
        meta: { correlationId: req.correlationId },
      });
    } catch (err) {
      next(err);
    }
  }

  async explainWorkflow(req, res, next) {
    try {
      const workflow = await this.workflowRepository.findById(req.params.id);
      if (!workflow) throw new NotFoundError(`Workflow '${req.params.id}' not found`);

      const explanation = await this.geminiClient.explainWorkflow(workflow);

      res.json({
        success: true,
        data: { explanation },
        meta: { correlationId: req.correlationId },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AiController;
