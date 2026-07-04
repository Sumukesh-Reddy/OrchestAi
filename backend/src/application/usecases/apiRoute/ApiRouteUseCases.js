'use strict';

const { NotFoundError, ConflictError } = require('../../../domain/errors/AppError');

class CreateApiRouteUseCase {
  constructor({ apiRouteRepository, workflowRepository, cacheAdapter }) {
    this.apiRouteRepository = apiRouteRepository;
    this.workflowRepository = workflowRepository;
    this.cacheAdapter = cacheAdapter;
  }
  async execute(data) {
    const workflow = await this.workflowRepository.findById(data.workflowId);
    if (!workflow) throw new NotFoundError(`Workflow ${data.workflowId} not found`);
    const route = await this.apiRouteRepository.create(data);
    await this._invalidateCache(data.method, data.path, route._id?.toString());
    return route;
  }
  async _invalidateCache(method, path, id) {
    if (this.cacheAdapter) {
      await this.cacheAdapter.delete(`route:${method?.toUpperCase()}:${path}`);
      await this.cacheAdapter.delete('swagger:spec');
    }
  }
}

class UpdateApiRouteUseCase {
  constructor({ apiRouteRepository, cacheAdapter }) {
    this.apiRouteRepository = apiRouteRepository;
    this.cacheAdapter = cacheAdapter;
  }
  async execute(id, data) {
    const route = await this.apiRouteRepository.update(id, data);
    if (this.cacheAdapter) await this.cacheAdapter.delete('swagger:spec');
    return route;
  }
}

class DeleteApiRouteUseCase {
  constructor({ apiRouteRepository, cacheAdapter }) {
    this.apiRouteRepository = apiRouteRepository;
    this.cacheAdapter = cacheAdapter;
  }
  async execute(id) {
    await this.apiRouteRepository.delete(id);
    if (this.cacheAdapter) await this.cacheAdapter.delete('swagger:spec');
  }
}

class GetApiRouteUseCase {
  constructor(apiRouteRepository) { this.apiRouteRepository = apiRouteRepository; }
  async execute(id) {
    const route = await this.apiRouteRepository.findById(id);
    if (!route) throw new NotFoundError(`API Route ${id} not found`);
    return route;
  }
}

class ListApiRoutesUseCase {
  constructor(apiRouteRepository) { this.apiRouteRepository = apiRouteRepository; }
  async execute(options) { return this.apiRouteRepository.findAll(options); }
}

class ResolveApiRouteUseCase {
  constructor({ apiRouteRepository, cacheAdapter }) {
    this.apiRouteRepository = apiRouteRepository;
    this.cacheAdapter = cacheAdapter;
  }
  async execute({ method, path }) {
    const cacheKey = `route:${method.toUpperCase()}:${path}`;
    if (this.cacheAdapter) {
      const cached = await this.cacheAdapter.getValue(cacheKey);
      if (cached) return cached;
    }
    const route = await this.apiRouteRepository.findByMethodAndPath(method, path);
    if (route && this.cacheAdapter) {
      await this.cacheAdapter.set(cacheKey, route, 60);
    }
    return route;
  }
}

module.exports = {
  CreateApiRouteUseCase, UpdateApiRouteUseCase, DeleteApiRouteUseCase,
  GetApiRouteUseCase, ListApiRoutesUseCase, ResolveApiRouteUseCase,
};
