'use strict';

class DynamicController {
  constructor({ resolveApiRouteUseCase, executeWorkflowUseCase, requestMapper, responseMapper, cacheAdapter }) {
    Object.assign(this, { resolveApiRouteUseCase, executeWorkflowUseCase, requestMapper, responseMapper, cacheAdapter });
    this.handle = this.handle.bind(this);
  }

  async handle(req, res, next) {
    try {
      const apiRoute = req.apiRoute;
      if (!apiRoute) return next(new (require('../../../domain/errors/AppError').NotFoundError)('API route not found'));

      // Cache check
      if (apiRoute.cacheConfig?.enabled) {
        const cacheKey = this._resolveCacheKey(apiRoute.cacheConfig.keyTemplate, req);
        if (cacheKey) {
          const cached = await this.cacheAdapter.getValue(cacheKey);
          if (cached) {
            return res.json({ success: true, data: cached, meta: { correlationId: req.correlationId, cached: true } });
          }
        }
      }

      // Map request
      const mappedRequest = apiRoute.requestMapping
        ? this.requestMapper.map(apiRoute.requestMapping, req)
        : req.body;

      // Execute workflow
      const workflowId = apiRoute.workflowId?._id?.toString() || apiRoute.workflowId?.toString();
      const result = await this.executeWorkflowUseCase.execute({
        workflowId,
        workflowVersion: apiRoute.workflowVersion,
        request: {
          body: mappedRequest,
          query: req.query,
          params: req.params,
          headers: req.headers,
          method: req.method,
          path: req.path,
          ip: req.ip,
          get: (h) => req.get(h),
        },
        correlationId: req.correlationId,
        userId: req.user?.userId,
        apiRouteId: apiRoute._id?.toString(),
        apiRouteSlug: apiRoute.slug,
      });

      // Map response
      const finalResponse = apiRoute.responseMapping
        ? this.responseMapper.map(apiRoute.responseMapping, result.output)
        : result.output;

      // Cache response
      if (apiRoute.cacheConfig?.enabled && result.status === 'SUCCESS') {
        const cacheKey = this._resolveCacheKey(apiRoute.cacheConfig.keyTemplate, req);
        if (cacheKey) {
          await this.cacheAdapter.set(cacheKey, finalResponse, apiRoute.cacheConfig.ttl || 300);
        }
      }

      const statusCode = result.statusCode || (result.status === 'SUCCESS' ? 200 : 500);
      return res.status(statusCode).json({
        success: result.status !== 'FAILED',
        data: finalResponse,
        meta: {
          correlationId: req.correlationId,
          executionId: result.executionId,
          duration: result.duration,
          cached: false,
        },
        errors: result.status === 'FAILED' ? [{ code: 'WORKFLOW_FAILED', message: result.error?.message || 'Workflow execution failed' }] : undefined,
      });
    } catch (err) {
      next(err);
    }
  }

  _resolveCacheKey(keyTemplate, req) {
    if (!keyTemplate) return null;
    try {
      return keyTemplate.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
        const parts = expr.trim().split('.');
        let obj = { params: req.params, query: req.query, body: req.body };
        for (const p of parts) obj = obj?.[p];
        return obj ?? '';
      });
    } catch {
      return null;
    }
  }
}

module.exports = DynamicController;
