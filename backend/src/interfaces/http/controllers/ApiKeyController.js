'use strict';

const { ValidationError } = require('../../../domain/errors/AppError');
const Joi = require('joi');

class ApiKeyController {
  constructor({ generateApiKeyUseCase, apiKeyRepository }) {
    this.generateApiKeyUseCase = generateApiKeyUseCase;
    this.apiKeyRepository = apiKeyRepository;
    this.generate = this.generate.bind(this);
    this.list = this.list.bind(this);
    this.revoke = this.revoke.bind(this);
  }

  async generate(req, res, next) {
    try {
      const { error, value } = Joi.object({
        label: Joi.string().required().max(100),
        scopes: Joi.array().items(Joi.string().valid('read', 'execute', 'admin')).default(['read', 'execute']),
        expiresAt: Joi.date().greater('now').optional(),
        description: Joi.string().max(500).allow('').optional(),
      }).validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);

      const result = await this.generateApiKeyUseCase.execute({ ...value, userId: req.user.userId });
      res.status(201).json({
        success: true,
        data: { ...result, warning: 'Save this key now. It will not be shown again.' },
        meta: { correlationId: req.correlationId },
      });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const keys = await this.apiKeyRepository.findByUserId(req.user.userId);
      res.json({ success: true, data: { keys }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }

  async revoke(req, res, next) {
    try {
      await this.apiKeyRepository.revoke(req.params.id, req.user.userId);
      res.json({ success: true, data: { message: 'API key revoked' }, meta: { correlationId: req.correlationId } });
    } catch (err) { next(err); }
  }
}

module.exports = ApiKeyController;
