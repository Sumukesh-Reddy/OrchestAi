import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, { 
  ReactFlowProvider, 
  Background, 
  Controls, 
  MiniMap, 
  BackgroundVariant 
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '../store/workflowStore';
import NodePalette from '../components/workflow/NodePalette';
import NodeConfigPanel from '../components/workflow/NodeConfigPanel';
import { 
  ValidatorNode, 
  HttpRequestNode, 
  TransformNode, 
  ConditionNode, 
  ParallelNode, 
  MergeNode, 
  ReturnNode, 
  RetryNode, 
  CacheNode, 
  AiAgentNode, 
  ResponseMapperNode 
} from '../components/workflow/nodes/CustomNodes';
import { 
  Save, 
  UploadCloud, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  History,
  Info
} from 'lucide-react';
import { api } from '../store/authStore';

// Register custom node types
const nodeTypes = {
  VALIDATOR: ValidatorNode,
  HTTP_REQUEST: HttpRequestNode,
  TRANSFORM: TransformNode,
  CONDITION: ConditionNode,
  PARALLEL: ParallelNode,
  MERGE: MergeNode,
  RETURN: ReturnNode,
  RETRY_WRAPPER: RetryNode,
  CACHE_CHECK: CacheNode,
  CACHE_WRITE: CacheNode,
  AI_AGENT: AiAgentNode,
  RESPONSE_MAPPER: ResponseMapperNode,
};

function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const {
    currentWorkflow,
    nodes,
    edges,
    isLoading,
    isDirty,
    error,
    fetchWorkflow,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    saveDraft,
    publishWorkflow,
    clearError
  } = useWorkflowStore();

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [changeLog, setChangeLog] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    fetchWorkflow(id);
    return () => clearError();
  }, [id, fetchWorkflow, clearError]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type.toLowerCase()}_${Date.now()}`,
        type,
        position,
        data: { label: `${type} node`, type, config: {} },
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode]
  );

  const handleSave = async () => {
    const success = await saveDraft();
    if (success) {
      alert('Draft saved successfully!');
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const success = await publishWorkflow(changeLog);
    if (success) {
      setChangeLog('');
      setPublishModalOpen(false);
      alert('Workflow version published successfully!');
    }
  };

  const handleExplain = async () => {
    setExplainLoading(true);
    try {
      const response = await api.post(`/ai/explain-workflow/${id}`);
      setExplanation(response.data.data.explanation);
    } catch (err) {
      alert('Failed to generate workflow explanation.');
    } finally {
      setExplainLoading(true);
      // Wait a bit to close mock loader
      setExplainLoading(false);
    }
  };

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  if (isLoading && !currentWorkflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-8rem)] flex flex-col glass-panel overflow-hidden relative">
      {/* Canvas Header/Toolbar */}
      <header className="bg-slate-950/80 px-6 py-4 border-b border-slate-900/60 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/workflows')}
            className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>{currentWorkflow?.name}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
              )}
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Active version: <span className="font-semibold text-brand-400">v{currentWorkflow?.currentVersion || 0}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExplain}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-semibold py-2 px-3 border border-slate-800 rounded-xl transition"
          >
            <Sparkles size={14} className="text-brand-400" />
            <span>AI Explain</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold py-2 px-3 border border-slate-800 rounded-xl transition"
          >
            <Save size={14} />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => setPublishModalOpen(true)}
            className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-xs font-semibold py-2 px-4 rounded-xl shadow-glow-brand transition text-slate-100"
          >
            <UploadCloud size={14} />
            <span>Publish Version</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Node Palette */}
        <NodePalette />

        {/* Center Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
            <Controls />
            <MiniMap 
              nodeColor={(n) => {
                if (n.type === 'RETURN') return '#10b981';
                if (n.type === 'HTTP_REQUEST') return '#3b82f6';
                if (n.type === 'AI_AGENT') return '#8b5cf6';
                return '#1e293b';
              }}
              maskColor="rgba(3, 6, 15, 0.7)"
              className="!bg-slate-950 !border-slate-800"
            />
          </ReactFlow>
        </div>

        {/* Right Configuration panel */}
        <NodeConfigPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
      </div>

      {/* AI Explanation panel overlay */}
      {explanation && (
        <div className="absolute bottom-6 left-6 max-w-lg bg-slate-950/95 border border-slate-800 p-5 rounded-2xl shadow-2xl z-30 flex flex-col space-y-3 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="flex items-center space-x-1.5 text-xs font-bold text-brand-300">
              <Sparkles size={14} />
              <span>AI Explanation</span>
            </span>
            <button onClick={() => setExplanation('')} className="text-slate-500 hover:text-slate-300 text-xs">
              Dismiss
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">{explanation}</p>
        </div>
      )}

      {/* Publish Version Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#090d16] border border-slate-800/80 p-8 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2 mb-2">
              <UploadCloud className="text-brand-400" size={22} />
              <span>Publish Workflow Version</span>
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Publishing compiles the current canvas graph. It creates an immutable historical version snapshot.
            </p>

            <form onSubmit={handlePublish} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Change Log / Notes</label>
                <textarea
                  required
                  value={changeLog}
                  onChange={(e) => setChangeLog(e.target.value)}
                  placeholder="e.g. Added user status check node and retry wrapper"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium transition shadow-glow-brand"
                >
                  Compile & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
