'use strict';

const WorkflowModel = require('./models/WorkflowModel');
const { NotFoundError } = require('../../domain/errors/AppError');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('MongoWorkflowRepository');

/**
 * MongoDB implementation of the Workflow repository.
 */
class MongoWorkflowRepository {
  /**
   * Find workflow by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const workflow = await WorkflowModel.findById(id)
      .populate('createdBy', 'email role firstName lastName')
      .lean();
    return workflow || null;
  }

  /**
   * Find workflow by ID (raw Mongoose document for method calls).
   * @param {string} id
   * @returns {Promise<mongoose.Document|null>}
   */
  async findRawById(id) {
    return WorkflowModel.findById(id);
  }

  /**
   * List workflows with pagination and filtering.
   * @param {object} options
   * @returns {Promise<object>}
   */
  async findAll({ page = 1, limit = 20, status, tags, search, createdBy } = {}) {
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    if (search) filter.$text = { $search: search };
    if (createdBy) filter.createdBy = createdBy;

    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      WorkflowModel.find(filter)
        .populate('createdBy', 'email role')
        .select('-versions') // Don't send all versions in list view
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WorkflowModel.countDocuments(filter),
    ]);

    return {
      workflows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new workflow.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const workflow = await WorkflowModel.create(data);
    return workflow.toObject();
  }

  /**
   * Update a workflow.
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, data) {
    const workflow = await WorkflowModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).populate('createdBy', 'email role');
    if (!workflow) throw new NotFoundError(`Workflow with ID ${id} not found`);
    return workflow.toObject();
  }

  /**
   * Soft-delete a workflow.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const result = await WorkflowModel.findByIdAndUpdate(id, {
      $set: { isActive: false, status: 'archived' },
    });
    if (!result) throw new NotFoundError(`Workflow with ID ${id} not found`);
  }

  /**
   * Publish a new version of a workflow.
   * @param {string} id
   * @param {Array} nodes
   * @param {Array} edges
   * @param {string} userId
   * @param {string} changeLog
   * @returns {Promise<object>}
   */
  async publishVersion(id, nodes, edges, userId, changeLog) {
    const workflow = await WorkflowModel.findById(id);
    if (!workflow) throw new NotFoundError(`Workflow with ID ${id} not found`);

    workflow.publishVersion(nodes, edges, userId, changeLog);
    await workflow.save();
    return workflow.toObject();
  }

  /**
   * Get a specific version of a workflow.
   * @param {string} id
   * @param {number} version
   * @returns {Promise<object|null>}
   */
  async getVersion(id, version) {
    const workflow = await WorkflowModel.findById(id).lean();
    if (!workflow) throw new NotFoundError(`Workflow with ID ${id} not found`);

    const versionData = workflow.versions.find((v) => v.version === parseInt(version, 10));
    if (!versionData) throw new NotFoundError(`Version ${version} not found for workflow ${id}`);

    return versionData;
  }

  /**
   * Get all versions list (metadata only, no nodes/edges).
   * @param {string} id
   * @returns {Promise<Array>}
   */
  async getVersionsList(id) {
    const workflow = await WorkflowModel.findById(id)
      .populate('versions.publishedBy', 'email')
      .lean();
    if (!workflow) throw new NotFoundError(`Workflow with ID ${id} not found`);

    return workflow.versions.map((v) => ({
      version: v.version,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
      changeLog: v.changeLog,
      nodeCount: v.nodes ? v.nodes.length : 0,
      edgeCount: v.edges ? v.edges.length : 0,
    }));
  }

  /**
   * Duplicate a workflow (creates a new draft copy).
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async duplicate(id, userId) {
    const original = await WorkflowModel.findById(id).lean();
    if (!original) throw new NotFoundError(`Workflow with ID ${id} not found`);

    const copy = await WorkflowModel.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      createdBy: userId,
      draftNodes: original.draftNodes || [],
      draftEdges: original.draftEdges || [],
      tags: original.tags,
      status: 'draft',
      currentVersion: 0,
      versions: [],
    });

    return copy.toObject();
  }
}

module.exports = MongoWorkflowRepository;
