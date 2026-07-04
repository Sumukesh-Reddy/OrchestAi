import React from 'react';
import { 
  Globe, 
  Settings2, 
  GitFork, 
  Shuffle, 
  Database, 
  LogOut, 
  History, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function NodePalette() {
  const nodeTypes = [
    { type: 'VALIDATOR', label: 'Schema Validator', icon: ShieldCheck, desc: 'Validates inputs using AJV', color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
    { type: 'HTTP_REQUEST', label: 'HTTP Request', icon: Globe, desc: 'Call downstream REST APIs', color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
    { type: 'TRANSFORM', label: 'Transform Mapping', icon: Settings2, desc: 'Map fields via JSONPath', color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
    { type: 'CONDITION', label: 'Condition Branch', icon: Shuffle, desc: 'Boolean routing logic', color: 'text-purple-400 bg-purple-500/5 border-purple-500/10' },
    { type: 'PARALLEL', label: 'Parallel Group', icon: GitFork, desc: 'Fans out jobs to BullMQ', color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' },
    { type: 'MERGE', label: 'Merge Output', icon: GitFork, desc: 'Combines parallel outputs', color: 'text-teal-400 bg-teal-500/5 border-teal-500/10' },
    { type: 'RETRY_WRAPPER', label: 'Retry Wrapper', icon: History, desc: 'Retry on failure backoff', color: 'text-orange-400 bg-orange-500/5 border-orange-500/10' },
    { type: 'CACHE_CHECK', label: 'Cache Check', icon: Database, desc: 'Check Redis cache hit', color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10' },
    { type: 'CACHE_WRITE', label: 'Cache Write', icon: Database, desc: 'Save output to Redis cache', color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10' },
    { type: 'AI_AGENT', label: 'Gemini AI Agent', icon: Sparkles, desc: 'Integrate Gemini LLM steps', color: 'text-brand-400 bg-brand-500/5 border-brand-500/10 font-medium' },
    { type: 'RESPONSE_MAPPER', label: 'Response Mapper', icon: Settings2, desc: 'Final response template', color: 'text-pink-400 bg-pink-500/5 border-pink-500/10' },
    { type: 'RETURN', label: 'Return Response', icon: LogOut, desc: 'Terminate and return response', color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-72 bg-[#090d16]/40 border-r border-slate-900/80 p-5 flex flex-col space-y-4 select-none">
      <div>
        <h3 className="text-sm font-bold text-slate-200">Node Palette</h3>
        <p className="text-xs text-slate-500 mt-1">Drag and drop nodes onto the canvas to construct your orchestration DAG.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {nodeTypes.map((node) => {
          const NodeIcon = node.icon;
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(event) => onDragStart(event, node.type)}
              className={`
                flex items-start space-x-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/20 cursor-grab hover:border-slate-700/80 hover:bg-slate-900/50 transition-all duration-200
              `}
            >
              <div className={`p-2 rounded-lg border ${node.color}`}>
                <NodeIcon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200">{node.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{node.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
