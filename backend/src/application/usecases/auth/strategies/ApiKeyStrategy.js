'use strict';

class ApiKeyStrategy {
  constructor(validateApiKeyUseCase) {
    this.validateApiKeyUseCase = validateApiKeyUseCase;
  }

  async verify(rawKey) {
    const result = await this.validateApiKeyUseCase.execute(rawKey);
    return { userId: result.userId, scopes: result.scopes, isApiKey: true };
  }
}

module.exports = ApiKeyStrategy;
