'use strict';

const DagBuilder = require('../../execution/DagBuilder');

// CreateWorkflowUseCase
class CreateWorkflowUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute({ name, description, tags, createdBy }) {
    return this.workflowRepository.create({ name, description, tags: tags || [], createdBy: createdBy || null, status: 'draft', currentVersion: 0, versions: [] });
  }
}

// UpdateWorkflowUseCase
class UpdateWorkflowUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute({ id, name, description, tags, draftNodes, draftEdges }) {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (draftNodes !== undefined) updates.draftNodes = draftNodes;
    if (draftEdges !== undefined) updates.draftEdges = draftEdges;
    return this.workflowRepository.update(id, updates);
  }
}

// PublishWorkflowUseCase
class PublishWorkflowUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute({ id, nodes, edges, userId, changeLog }) {
    const dagBuilder = new DagBuilder();
    const validation = dagBuilder.validate(nodes, edges);
    if (!validation.valid) {
      const { ValidationError } = require('../../../domain/errors/AppError');
      throw new ValidationError('Workflow DAG is invalid', validation.errors.map((e) => ({ message: e })));
    }
    return this.workflowRepository.publishVersion(id, nodes, edges, userId, changeLog);
  }
}

// GetWorkflowUseCase
class GetWorkflowUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute({ id }) {
    const { NotFoundError } = require('../../../domain/errors/AppError');
    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) throw new NotFoundError(`Workflow ${id} not found`);
    return workflow;
  }
}

// ListWorkflowsUseCase
class ListWorkflowsUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute(options) { return this.workflowRepository.findAll(options); }
}

// DeleteWorkflowUseCase
class DeleteWorkflowUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute({ id }) { return this.workflowRepository.delete(id); }
}

// DuplicateWorkflowUseCase
class DuplicateWorkflowUseCase {
  constructor(workflowRepository) { this.workflowRepository = workflowRepository; }
  async execute({ id, userId }) { return this.workflowRepository.duplicate(id, userId); }
}

module.exports = {
  CreateWorkflowUseCase, UpdateWorkflowUseCase, PublishWorkflowUseCase,
  GetWorkflowUseCase, ListWorkflowsUseCase, DeleteWorkflowUseCase, DuplicateWorkflowUseCase,
};
