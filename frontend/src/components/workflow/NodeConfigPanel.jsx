import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Trash2, AlertCircle, HelpCircle, Sparkles, Plus, X } from 'lucide-react';
import { api } from '../../store/authStore';

export default function NodeConfigPanel({ nodeId, onClose }) {
  const { nodes, updateNodeConfig, updateNodeLabel, updateNodeOnError, deleteNode } = useWorkflowStore();
  const node = nodes.find((n) => n.id === nodeId);

  const [label, setLabel] = useState('');
  const [errorStrategy, setErrorStrategy] = useState('STOP');
  const [maxRetries, setMaxRetries] = useState(3);
  const [fallbackNodeId, setFallbackNodeId] = useState('');
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.data?.label || '');
      setErrorStrategy(node.onError?.strategy || 'STOP');
      setMaxRetries(node.onError?.maxRetries || 3);
      setFallbackNodeId(node.onError?.fallbackNodeId || '');
    }
  }, [nodeId, node]);

  if (!node) {
    return (
      <aside className="w-80 flex-shrink-0 bg-[#090d16]/40 border-l border-slate-900/80 p-5 text-center text-slate-500">
        Select a node to inspect and edit its configuration properties.
      </aside>
    );
  }

  const handleLabelChange = (val) => {
    setLabel(val);
    updateNodeLabel(nodeId, val);
  };

  const handleOnErrorChange = (key, val) => {
    const updatedOnError = {
      strategy: errorStrategy,
      maxRetries,
      fallbackNodeId,
      [key]: val,
    };
    if (key === 'strategy') setErrorStrategy(val);
    if (key === 'maxRetries') setMaxRetries(val);
    if (key === 'fallbackNodeId') setFallbackNodeId(val);

    updateNodeOnError(nodeId, updatedOnError);
  };

  const handleConfigChange = (key, value) => {
    updateNodeConfig(nodeId, { [key]: value });
  };

  // Suggester mapping trigger (sends current input sample and desired schema to gemini)
  const triggerAiMappingSuggestion = async () => {
    setAiSuggestLoading(true);
    try {
      const response = await api.post('/ai/suggest-mappings', {
        inputSample: { user: { id: 101, details: { firstName: 'Alice', email: 'alice@test.com' } } },
        outputSchema: {
          type: 'object',
          properties: {
            clientId: { type: 'number' },
            clientEmail: { type: 'string' },
          },
        },
      });
      const suggestedMappings = response.data.data.mappings;
      handleConfigChange('mappings', suggestedMappings);
      alert('AI mapping rules suggested and loaded successfully!');
    } catch (err) {
      alert('Failed to fetch AI suggestion.');
    } finally {
      setAiSuggestLoading(false);
    }
  };

  return (
    <aside className="w-80 flex-shrink-0 bg-[#090d16]/40 border-l border-slate-900/80 p-5 flex flex-col space-y-5 select-none overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Configure Node</h3>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {node.id}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Basic properties */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Node Name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Node specific properties */}
      <div className="space-y-4 pt-4 border-t border-slate-900/60">
        <h4 className="text-xs font-bold text-slate-300">Plugin Settings</h4>

        {/* HTTP REQUEST */}
        {node.type === 'HTTP_REQUEST' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">HTTP Method</label>
              <select
                value={node.data.config?.method || 'GET'}
                onChange={(e) => handleConfigChange('method', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Endpoint URL</label>
              <input
                type="text"
                value={node.data.config?.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://api.example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timeout (ms)</label>
              <input
                type="number"
                value={node.data.config?.timeout || 10000}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* TRANSFORM */}
        {node.type === 'TRANSFORM' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Field Mappings</label>
              <button
                onClick={triggerAiMappingSuggestion}
                disabled={aiSuggestLoading}
                className="flex items-center space-x-1 text-[10px] text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 px-2 py-0.5 rounded transition"
              >
                <Sparkles size={10} />
                <span>AI Suggest</span>
              </button>
            </div>

            {/* List current mappings */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {(node.data.config?.mappings || []).map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="flex-1 min-w-0 text-[10px] font-mono">
                    <div className="truncate text-slate-400">from: {m.from}</div>
                    <div className="truncate text-slate-200 mt-0.5">to: {m.to}</div>
                  </div>
                  <button
                    onClick={() => {
                      const updated = (node.data.config.mappings || []).filter((_, i) => i !== idx);
                      handleConfigChange('mappings', updated);
                    }}
                    className="text-red-500 hover:text-red-400 p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add manual mapping mapping */}
            <button
              onClick={() => {
                const current = node.data.config?.mappings || [];
                handleConfigChange('mappings', [...current, { from: '$.source', to: 'target' }]);
              }}
              className="w-full flex items-center justify-center space-x-1.5 py-2 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-400 transition"
            >
              <Plus size={12} />
              <span>Add Mapping Rule</span>
            </button>
          </div>
        )}

        {/* VALIDATOR */}
        {node.type === 'VALIDATOR' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Input Path</label>
              <input
                type="text"
                value={node.data.config?.inputPath || 'request.body'}
                onChange={(e) => handleConfigChange('inputPath', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Schema definition (JSON)</label>
              <textarea
                value={typeof node.data.config?.schema === 'object' ? JSON.stringify(node.data.config.schema, null, 2) : node.data.config?.schema || ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleConfigChange('schema', parsed);
                  } catch {
                    handleConfigChange('schema', e.target.value);
                  }
                }}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </>
        )}

        {/* RETURN */}
        {node.type === 'RETURN' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status Code</label>
              <input
                type="number"
                value={node.data.config?.statusCode || 200}
                onChange={(e) => handleConfigChange('statusCode', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source Node Output ID</label>
              <input
                type="text"
                value={node.data.config?.sourceNodeId || ''}
                onChange={(e) => handleConfigChange('sourceNodeId', e.target.value)}
                placeholder="e.g. tx_1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* RESPONSE_MAPPER */}
        {node.type === 'RESPONSE_MAPPER' && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Response Template (JSON)</label>
            <textarea
              value={typeof node.data.config?.template === 'object' ? JSON.stringify(node.data.config.template, null, 2) : node.data.config?.template || ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleConfigChange('template', parsed);
                } catch {
                  handleConfigChange('template', e.target.value);
                }
              }}
              rows={5}
              placeholder="{\n  \&quot;status\&quot;: \&quot;success\&quot;,\n  \&quot;data\&quot;: \&quot;{{outputs.ai_1.data}}\&quot;\n}"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-slate-100 focus:outline-none resize-none"
            />
          </div>
        )}

        {/* CONDITION */}
        {node.type === 'CONDITION' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">JSONLogic Expression</label>
              <textarea
                value={typeof node.data.config?.expression === 'object' ? JSON.stringify(node.data.config.expression, null, 2) : node.data.config?.expression || ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleConfigChange('expression', parsed);
                  } catch {
                    handleConfigChange('expression', e.target.value);
                  }
                }}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-slate-100 focus:outline-none resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">True Target Handle</label>
              <input
                type="text"
                value={node.data.config?.trueTarget || ''}
                onChange={(e) => handleConfigChange('trueTarget', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">False Target Handle</label>
              <input
                type="text"
                value={node.data.config?.falseTarget || ''}
                onChange={(e) => handleConfigChange('falseTarget', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* AI AGENT */}
        {node.type === 'AI_AGENT' && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Prompt Template</label>
              <textarea
                value={node.data.config?.promptTemplate || ''}
                onChange={(e) => handleConfigChange('promptTemplate', e.target.value)}
                rows={3}
                placeholder="Classify user sentiment: {{outputs.val_1.data.text}}"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Output JSON Schema (Optional)</label>
              <textarea
                value={typeof node.data.config?.outputSchema === 'object' ? JSON.stringify(node.data.config.outputSchema, null, 2) : node.data.config?.outputSchema || ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleConfigChange('outputSchema', parsed);
                  } catch {
                    handleConfigChange('outputSchema', e.target.value);
                  }
                }}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-slate-100 focus:outline-none resize-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Error handling parameters */}
      <div className="space-y-4 pt-4 border-t border-slate-900/60">
        <h4 className="text-xs font-bold text-slate-300">Failure Handling</h4>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OnError Strategy</label>
          <select
            value={errorStrategy}
            onChange={(e) => handleOnErrorChange('strategy', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
          >
            <option value="STOP">STOP & FAIL</option>
            <option value="SKIP">SKIP & CONTINUE</option>
            <option value="RETRY">RETRY COMPONENT</option>
          </select>
        </div>

        {errorStrategy === 'RETRY' && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Max Retries</label>
            <input
              type="number"
              value={maxRetries}
              onChange={(e) => handleOnErrorChange('maxRetries', parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Delete trigger */}
      <div className="pt-6 border-t border-slate-900/60">
        <button
          onClick={() => {
            deleteNode(nodeId);
            onClose();
          }}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-500 text-sm font-medium rounded-xl transition duration-200"
        >
          <Trash2 size={16} />
          <span>Delete Node</span>
        </button>
      </div>
    </aside>
  );
}
