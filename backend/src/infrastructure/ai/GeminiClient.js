'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config/env');
const { createLogger } = require('../logger/WinstonLogger');

const logger = createLogger('GeminiClient');

/**
 * Client for the Google Gemini generative AI API.
 * Provides structured output generation and workflow generation capabilities.
 */
class GeminiClient {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.model;
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        maxOutputTokens: config.gemini.maxOutputTokens,
        temperature: config.gemini.temperature,
      },
    });
  }

  /**
   * Send a chat-style message with optional history.
   * @param {string} prompt
   * @param {string} [systemInstruction]
   * @param {Array<{role: string, parts: string}>} [history]
   * @returns {Promise<{text: string, usage: object}>}
   */
  async chat(prompt, systemInstruction, history = []) {
    try {
      const modelWithSystem = systemInstruction
        ? this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: { maxOutputTokens: config.gemini.maxOutputTokens, temperature: config.gemini.temperature },
          })
        : this.model;

      const chat = modelWithSystem.startChat({ history });
      const result = await chat.sendMessage(prompt);
      const response = await result.response;

      return {
        text: response.text(),
        usage: response.usageMetadata || {},
      };
    } catch (err) {
      logger.error('Gemini chat error', { error: err.message, model: this.modelName });
      throw new Error(`Gemini API error: ${err.message}`);
    }
  }

  /**
   * Generate structured JSON output using a prompt and expected schema description.
   * @param {string} prompt
   * @param {object} schema - JSON Schema describing expected output shape
   * @param {string} [systemInstruction]
   * @returns {Promise<object>}
   */
  async generateStructured(prompt, schema, systemInstruction) {
    const schemaDescription = JSON.stringify(schema, null, 2);
    const fullPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching this schema. No markdown, no explanation, no code blocks.

Expected schema:
${schemaDescription}`;

    const { text } = await this.chat(fullPrompt, systemInstruction);

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1].trim();
    }

    try {
      return JSON.parse(jsonText);
    } catch (parseErr) {
      logger.error('Failed to parse Gemini structured response', {
        rawResponse: text.substring(0, 200),
        error: parseErr.message,
      });
      throw new Error(`Gemini returned invalid JSON: ${parseErr.message}`);
    }
  }

  /**
   * Generate a complete workflow definition from a natural language description.
   * @param {string} naturalLanguageDescription
   * @returns {Promise<{name: string, description: string, nodes: Array, edges: Array}>}
   */
  async generateWorkflow(naturalLanguageDescription) {
    const systemInstruction = `You are an expert API workflow designer for the OrchestAI platform.
Your job is to generate workflow definitions as JSON based on natural language descriptions.

AVAILABLE NODE TYPES:
1. HTTP_REQUEST
   config: { url: string, method: "GET|POST|PUT|PATCH|DELETE", headers: object, body: object, params: object, timeout: number }

2. TRANSFORM  
   config: { mappings: [{ from: "$.jsonpath.expression", to: "outputKey", default: any }] }

3. CONDITION
   config: { expression: <JSONLogic object>, trueTarget: "nodeId", falseTarget: "nodeId" }

4. PARALLEL
   config: { nodeIds: ["nodeId1", "nodeId2"], waitForAll: true }

5. MERGE
   config: { sourceNodeIds: ["nodeId1", "nodeId2"], strategy: "FIRST_SUCCESS|ALL|MERGE_OBJECTS" }

6. VALIDATOR
   config: { schema: <JSON Schema object>, inputPath: "request.body", onFail: "STOP|CONTINUE" }

7. RESPONSE_MAPPER
   config: { template: { key: "{{outputs.nodeId.data.field}}" } }

8. RETRY_WRAPPER
   config: { targetNodeId: "nodeId", maxAttempts: 3, delay: 1000, backoffType: "exponential|fixed" }

9. CACHE_CHECK
   config: { keyTemplate: "prefix:{{request.body.id}}", ttl: 300 }

10. CACHE_WRITE
    config: { keyTemplate: "prefix:{{request.body.id}}", ttl: 300 }

11. AI_AGENT
    config: { promptTemplate: "text with {{outputs.nodeId.data.field}} interpolation", model: "gemini-2.0-flash", outputSchema: {} }

12. RETURN
    config: { sourceNodeId: "nodeId", statusCode: 200 }

EDGE FORMAT:
{ id: "e1", source: "sourceNodeId", target: "targetNodeId", condition: { type: "ALWAYS|EXPRESSION|STATUS" } }

RULES:
- Node IDs must be unique strings like "node_1", "http_1", "condition_1"
- Edges must form a valid DAG (no cycles)
- Every workflow should end with a RETURN or RESPONSE_MAPPER node
- Use realistic URLs and configurations
- Position nodes top-to-bottom: y increases by 150 for each level, x=400 for linear nodes`;

    const schema = {
      type: 'object',
      required: ['name', 'description', 'nodes', 'edges'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'type', 'label', 'config', 'position'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              label: { type: 'string' },
              config: { type: 'object' },
              position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
            },
          },
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'source', 'target'],
            properties: {
              id: { type: 'string' },
              source: { type: 'string' },
              target: { type: 'string' },
              label: { type: 'string' },
              condition: { type: 'object' },
            },
          },
        },
      },
    };

    logger.info('Generating workflow from natural language', {
      descriptionLength: naturalLanguageDescription.length,
    });

    return this.generateStructured(naturalLanguageDescription, schema, systemInstruction);
  }

  /**
   * Suggest JSONPath mappings given input and output schemas.
   * @param {object} inputSample - Sample input object
   * @param {object} outputSchema - Desired output shape
   * @returns {Promise<Array<{from: string, to: string}>>}
   */
  async suggestMappings(inputSample, outputSchema) {
    const prompt = `Given this input data:
${JSON.stringify(inputSample, null, 2)}

Generate JSONPath mappings to produce output matching this schema:
${JSON.stringify(outputSchema, null, 2)}

Return an array of mapping objects with "from" (JSONPath like $.field.nested) and "to" (output key name).`;

    return this.generateStructured(prompt, {
      type: 'array',
      items: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' } },
      },
    });
  }

  /**
   * Explain a workflow in plain English.
   * @param {object} workflow - Workflow document
   * @returns {Promise<string>}
   */
  async explainWorkflow(workflow) {
    const activeVersion = workflow.versions && workflow.versions.length > 0
      ? workflow.versions.find((v) => v.version === workflow.currentVersion)
      : null;

    const prompt = `Explain this API workflow in plain English for a non-technical audience:

Workflow: ${workflow.name}
Description: ${workflow.description}

Nodes: ${JSON.stringify(activeVersion ? activeVersion.nodes : workflow.draftNodes, null, 2)}
Edges: ${JSON.stringify(activeVersion ? activeVersion.edges : workflow.draftEdges, null, 2)}

Provide a clear, step-by-step explanation of what this workflow does.`;

    const { text } = await this.chat(prompt);
    return text;
  }

  /**
   * Analyze a failed execution and suggest fixes.
   * @param {object} executionLog - Full execution log document
   * @returns {Promise<string>}
   */
  async debugExecution(executionLog) {
    const failedNodes = (executionLog.nodeExecutions || []).filter((n) => n.status === 'FAILED');

    const prompt = `Analyze this failed API workflow execution and suggest fixes:

Execution ID: ${executionLog.executionId}
Status: ${executionLog.status}
Duration: ${executionLog.duration}ms

Failed nodes:
${JSON.stringify(failedNodes, null, 2)}

Overall error:
${JSON.stringify(executionLog.error, null, 2)}

Provide:
1. Root cause analysis
2. Specific fixes for each failed node
3. Recommendations to prevent recurrence`;

    const { text } = await this.chat(prompt);
    return text;
  }
}

module.exports = GeminiClient;
