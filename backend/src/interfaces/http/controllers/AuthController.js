'use strict';

const Joi = require('joi');
const { ValidationError } = require('../../../domain/errors/AppError');

/**
 * Auth controller — handles all authentication-related HTTP endpoints.
 */
class AuthController {
  constructor({ loginUseCase, registerUseCase, verifyEmailUseCase, refreshTokenUseCase, logoutUseCase, userRepository }) {
    this.loginUseCase = loginUseCase;
    this.registerUseCase = registerUseCase;
    this.verifyEmailUseCase = verifyEmailUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.logoutUseCase = logoutUseCase;
    this.userRepository = userRepository;

    // Bind methods
    this.register = this.register.bind(this);
    this.verify = this.verify.bind(this);
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
  }

  async register(req, res, next) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        role: Joi.string().valid('admin', 'developer', 'viewer').default('developer'),
        firstName: Joi.string().max(50).optional(),
        lastName: Joi.string().max(50).optional(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);

      const { user } = await this.registerUseCase.execute(value);
      res.status(201).json({ success: true, data: { user }, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async verify(req, res, next) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        code: Joi.string().length(6).required(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);

      const result = await this.verifyEmailUseCase.execute(value);
      res.json({ success: true, data: result, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      });
      const { error, value } = schema.validate(req.body);
      if (error) throw new ValidationError(error.details[0].message);

      const result = await this.loginUseCase.execute({
        ...value,
        meta: { userAgent: req.get('user-agent'), ip: req.ip },
      });

      res.json({ success: true, data: result, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new ValidationError('refreshToken is required');

      const result = await this.refreshTokenUseCase.execute({ refreshToken });
      res.json({ success: true, data: result, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (req.user && refreshToken) {
        await this.logoutUseCase.execute({ userId: req.user.userId, refreshToken });
      }
      res.json({ success: true, data: { message: 'Logged out successfully' }, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await this.userRepository.findById(req.user.userId);
      res.json({ success: true, data: { user }, meta: { correlationId: req.correlationId } });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
