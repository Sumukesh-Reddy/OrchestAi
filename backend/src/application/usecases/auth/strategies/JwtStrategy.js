'use strict';

const jwt = require('jsonwebtoken');
const config = require('../../../../config/env');
const { AuthenticationError } = require('../../../../domain/errors/AppError');

class JwtStrategy {
  verify(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return { userId: decoded.userId, role: decoded.role, email: decoded.email };
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Access token has expired');
      }
      throw new AuthenticationError('Invalid access token');
    }
  }
}

module.exports = JwtStrategy;
