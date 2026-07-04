'use strict';

const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('DagBuilder');

/**
 * Builds and analyzes Directed Acyclic Graphs (DAGs) from workflow node/edge definitions.
 */
class DagBuilder {
  /**
   * Build adjacency list and related data structures from nodes and edges.
   * @param {Array} nodes - Array of node objects { id, type, config, ... }
   * @param {Array} edges - Array of edge objects { source, target, condition }
   * @returns {{ adjacencyList: object, reverseAdjacency: object, inDegree: object, nodeMap: object }}
   */
  build(nodes, edges) {
    const nodeMap = {};
    const adjacencyList = {}; // nodeId → [{ target, condition, label }]
    const reverseAdjacency = {}; // nodeId → [sourceNodeId]
    const inDegree = {};

    // Initialize
    for (const node of nodes) {
      nodeMap[node.id] = node;
      adjacencyList[node.id] = [];
      reverseAdjacency[node.id] = [];
      inDegree[node.id] = 0;
    }

    // Build adjacency
    for (const edge of edges) {
      if (!nodeMap[edge.source]) {
        logger.warn('Edge references unknown source node', { edgeId: edge.id, source: edge.source });
        continue;
      }
      if (!nodeMap[edge.target]) {
        logger.warn('Edge references unknown target node', { edgeId: edge.id, target: edge.target });
        continue;
      }

      adjacencyList[edge.source].push({
        target: edge.target,
        condition: edge.condition || { type: 'ALWAYS' },
        label: edge.label || null,
        edgeId: edge.id,
      });

      reverseAdjacency[edge.target].push(edge.source);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }

    return { adjacencyList, reverseAdjacency, inDegree, nodeMap };
  }

  /**
   * Topological sort using Kahn's algorithm.
   * @param {Array} nodes
   * @param {Array} edges
   * @returns {Array<string>} Sorted array of node IDs
   * @throws {Error} If a cycle is detected
   */
  topologicalSort(nodes, edges) {
    const { adjacencyList, inDegree, nodeMap } = this.build(nodes, edges);

    const queue = [];
    const sortedIds = [];
    const tempInDegree = { ...inDegree };

    // Find all nodes with no incoming edges
    for (const nodeId of Object.keys(nodeMap)) {
      if (tempInDegree[nodeId] === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      sortedIds.push(current);

      for (const { target } of adjacencyList[current] || []) {
        tempInDegree[target]--;
        if (tempInDegree[target] === 0) {
          queue.push(target);
        }
      }
    }

    if (sortedIds.length !== nodes.length) {
      const cycleNodes = nodes.map((n) => n.id).filter((id) => !sortedIds.includes(id));
      throw new Error(`Workflow contains a cycle involving nodes: ${cycleNodes.join(', ')}`);
    }

    return sortedIds;
  }

  /**
   * Get nodes that have no incoming edges (entry points).
   * @param {Array} nodes
   * @param {Array} edges
   * @returns {Array<string>} Node IDs with no incoming edges
   */
  getEntryNodes(nodes, edges) {
    const { inDegree } = this.build(nodes, edges);
    return Object.entries(inDegree)
      .filter(([, degree]) => degree === 0)
      .map(([nodeId]) => nodeId);
  }

  /**
   * Validate that a workflow DAG is well-formed.
   * @param {Array} nodes
   * @param {Array} edges
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(nodes, edges) {
    const errors = [];

    if (!nodes || nodes.length === 0) {
      errors.push('Workflow must have at least one node');
      return { valid: false, errors };
    }

    const nodeIds = new Set(nodes.map((n) => n.id));

    // Check all node IDs are unique
    if (nodeIds.size !== nodes.length) {
      errors.push('Duplicate node IDs found');
    }

    // Check edge references
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references unknown source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references unknown target node: ${edge.target}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Check for cycles
    try {
      this.topologicalSort(nodes, edges);
    } catch (err) {
      errors.push(err.message);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all predecessors of a node (for determining if a node can execute).
   * @param {string} nodeId
   * @param {{ reverseAdjacency: object }} dag
   * @returns {Array<string>}
   */
  getPredecessors(nodeId, { reverseAdjacency }) {
    return reverseAdjacency[nodeId] || [];
  }

  /**
   * Get all successors of a node.
   * @param {string} nodeId
   * @param {{ adjacencyList: object }} dag
   * @returns {Array<{target: string, condition: object}>}
   */
  getSuccessors(nodeId, { adjacencyList }) {
    return adjacencyList[nodeId] || [];
  }
}

module.exports = DagBuilder;
