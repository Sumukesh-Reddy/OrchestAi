'use strict';

const BasePlugin = require('./BasePlugin');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('MergePlugin');

/**
 * MERGE plugin — combines outputs from multiple parallel nodes into one.
 */
class MergePlugin extends BasePlugin {
  get type() {
    return 'MERGE';
  }

  /**
   * @param {object} config
   * @param {string[]} config.sourceNodeIds - Node IDs whose outputs to merge
   * @param {string} [config.strategy='MERGE_OBJECTS'] - FIRST_SUCCESS | ALL | MERGE_OBJECTS
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { sourceNodeIds = [], strategy = 'MERGE_OBJECTS' } = config;

    const outputs = sourceNodeIds.map((nodeId) => {
      const output = context.getOutput(nodeId);
      return { nodeId, output };
    }).filter(({ output }) => output !== null);

    logger.debug('Merge executing', {
      strategy,
      sourceCount: sourceNodeIds.length,
      availableCount: outputs.length,
      executionId: context.metadata.executionId,
    });

    let merged;

    switch (strategy) {
      case 'FIRST_SUCCESS': {
        const firstSuccess = outputs.find(
          ({ output }) => output.nodeStatus === 'SUCCESS' || !output.error
        );
        merged = firstSuccess ? firstSuccess.output.data || firstSuccess.output : null;
        break;
      }

      case 'ALL': {
        merged = outputs.map(({ nodeId, output }) => ({
          nodeId,
          data: output.data || output,
          status: output.nodeStatus || 'UNKNOWN',
        }));
        break;
      }

      case 'MERGE_OBJECTS':
      default: {
        merged = {};
        for (const { output } of outputs) {
          const data = output.data || output.output || output;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            Object.assign(merged, data);
          }
        }
        break;
      }
    }

    return {
      output: { merged, strategy, sourceCount: outputs.length },
      nodeStatus: 'SUCCESS',
    };
  }

  validate(config) {
    const errors = [];
    if (!config.sourceNodeIds || !Array.isArray(config.sourceNodeIds)) {
      errors.push('sourceNodeIds must be an array');
    } else if (config.sourceNodeIds.length < 2) {
      errors.push('sourceNodeIds must have at least 2 entries');
    }
    const validStrategies = ['FIRST_SUCCESS', 'ALL', 'MERGE_OBJECTS'];
    if (config.strategy && !validStrategies.includes(config.strategy)) {
      errors.push(`strategy must be one of: ${validStrategies.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = MergePlugin;
