'use strict';

const BasePlugin = require('./BasePlugin');
const GeminiClient = require('../../infrastructure/ai/GeminiClient');
const { createLogger } = require('../../infrastructure/logger/WinstonLogger');

const logger = createLogger('AiAgentPlugin');

let geminiClient;
function getGeminiClient() {
  if (!geminiClient) {
    geminiClient = new GeminiClient();
  }
  return geminiClient;
}

/**
 * AI_AGENT plugin — runs a Gemini AI step within a workflow.
 */
class AiAgentPlugin extends BasePlugin {
  get type() {
    return 'AI_AGENT';
  }

  /**
   * @param {object} config
   * @param {string} config.promptTemplate - Prompt with {{expression}} interpolation
   * @param {string} [config.model] - Gemini model name
   * @param {object} [config.outputSchema] - Expected output shape
   * @param {string} [config.systemInstruction] - System instruction for the model
   * @param {import('../execution/ExecutionContext')} context
   * @returns {Promise<object>}
   */
  async execute(config, context) {
    const { promptTemplate, outputSchema, systemInstruction } = config;

    const resolvedPrompt = context.resolveTemplate(promptTemplate);
    const resolvedSystemInstruction = systemInstruction
      ? context.resolveTemplate(systemInstruction)
      : undefined;

    logger.info('AI_AGENT executing', {
      promptLength: resolvedPrompt.length,
      hasOutputSchema: !!outputSchema,
      executionId: context.metadata.executionId,
    });

    const client = getGeminiClient();
    let result;
    let usage = {};

    try {
      if (outputSchema) {
        result = await client.generateStructured(resolvedPrompt, outputSchema, resolvedSystemInstruction);
      } else {
        const response = await client.chat(resolvedPrompt, resolvedSystemInstruction);
        result = response.text;
        usage = response.usage;
      }
    } catch (err) {
      logger.error('AI_AGENT execution failed', { error: err.message });
      return {
        output: null,
        nodeStatus: 'FAILED',
        error: { message: `AI Agent error: ${err.message}` },
      };
    }

    return {
      output: { result, usage },
      nodeStatus: 'SUCCESS',
    };
  }

  validate(config) {
    const errors = [];
    if (!config.promptTemplate) {
      errors.push('promptTemplate is required');
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = AiAgentPlugin;
