'use strict';

const { v4: uuidv4 } = require('uuid');
const ExecutionEngine = require('../../execution/ExecutionEngine');
const { NotFoundError, WorkflowExecutionError } = require('../../../domain/errors/AppError');
const { createLogger } = require('../../../infrastructure/logger/WinstonLogger');

const logger = createLogger('ExecuteWorkflowUseCase');

class ExecuteWorkflowUseCase {
  constructor({ workflowRepository, executionLogRepository, pluginRegistry }) {
    this.workflowRepository = workflowRepository;
    this.executionLogRepository = executionLogRepository;
    this.engine = new ExecutionEngine({ pluginRegistry });
  }

  async execute({ workflowId, workflowVersion, request, correlationId, userId, apiRouteId, apiRouteSlug }) {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Load workflow
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) throw new NotFoundError(`Workflow ${workflowId} not found`);

    // Determine which version to use
    let versionData;
    if (workflowVersion) {
      versionData = await this.workflowRepository.getVersion(workflowId, workflowVersion);
    } else {
      versionData = workflow.versions
        ? workflow.versions.find((v) => v.version === workflow.currentVersion)
        : null;
    }

    if (!versionData && workflow.currentVersion === 0) {
      // Use draft nodes if not yet published
      versionData = { nodes: workflow.draftNodes || [], edges: workflow.draftEdges || [] };
    }

    if (!versionData) {
      throw new NotFoundError(`No active version found for workflow ${workflowId}`);
    }

    // Create initial RUNNING log
    const logEntry = await this.executionLogRepository.create({
      executionId,
      apiRouteId: apiRouteId || null,
      apiRouteSlug: apiRouteSlug || null,
      workflowId,
      workflowVersion: workflow.currentVersion,
      correlationId,
      status: 'RUNNING',
      request: {
        method: request.method,
        path: request.path,
        headers: this._sanitizeHeaders(request.headers),
        body: request.body,
        query: request.query,
        params: request.params,
      },
      ip: request.ip,
      userAgent: request.get ? request.get('user-agent') : null,
      userId: userId || null,
    });

    // Execute
    let result;
    try {
      result = await this.engine.execute(versionData, request, {
        executionId,
        correlationId,
        workflowId,
        workflowVersion: workflow.currentVersion,
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      await this.executionLogRepository.update(executionId, {
        status: 'FAILED',
        duration,
        error: { message: err.message, code: err.code },
      });
      throw new WorkflowExecutionError(err.message, { workflowId, executionId });
    }

    const duration = Date.now() - startTime;

    // Update log with results
    await this.executionLogRepository.update(executionId, {
      status: result.status,
      duration,
      nodeExecutions: result.nodeExecutions,
      finalOutput: result.output,
      error: result.error,
    });

    logger.info('Workflow executed', { executionId, workflowId, status: result.status, duration });

    return {
      executionId,
      status: result.status,
      duration,
      output: result.output,
      statusCode: result.statusCode || 200,
      nodeExecutions: result.nodeExecutions,
    };
  }

  _sanitizeHeaders(headers) {
    if (!headers) return {};
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'cookie'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) sanitized[key] = '[REDACTED]';
    }
    return sanitized;
  }
}

module.exports = ExecuteWorkflowUseCase;
