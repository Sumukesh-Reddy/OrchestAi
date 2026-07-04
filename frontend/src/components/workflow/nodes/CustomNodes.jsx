import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Globe, 
  Settings2, 
  GitFork, 
  Shuffle, 
  HelpCircle, 
  History, 
  Database, 
  LogOut, 
  CheckCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const nodeBaseStyles = "px-4 py-3 rounded-xl border shadow-lg text-slate-100 flex flex-col font-sans transition-all duration-300 w-64 min-h-[75px]";

export function ValidatorNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-emerald-500/30 hover:border-emerald-500/60
      ${selected ? 'ring-1 ring-emerald-500/80 shadow-glow-green border-emerald-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700 !border-slate-800" />
      <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <ShieldCheck size={14} />
        <span>VALIDATE SCHEMA</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Validate Input'}</p>
      <p className="text-xs text-slate-500 truncate mt-1">onFail: {data.config?.onFail || 'STOP'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700 !border-slate-800" />
    </div>
  );
}

export function HttpRequestNode({ data, selected }) {
  const method = data.config?.method || 'GET';
  const methodColors = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-blue-500/30 hover:border-blue-500/60
      ${selected ? 'ring-1 ring-blue-500/80 shadow-glow-brand border-blue-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <Globe size={14} />
        <span>HTTP REQUEST</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <p className="font-semibold text-sm truncate flex-1">{data.label || 'Fetch Data'}</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${methodColors[method] || 'bg-slate-800 text-slate-400'}`}>
          {method}
        </span>
      </div>
      <p className="text-[10px] font-mono text-slate-500 truncate mt-1">{data.config?.url || 'https://api.example.com'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}

export function TransformNode({ data, selected }) {
  const mappingCount = data.config?.mappings?.length || 0;
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-amber-500/30 hover:border-amber-500/60
      ${selected ? 'ring-1 ring-amber-500/80 shadow-glow-brand border-amber-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <Settings2 size={14} />
        <span>DATA MAPPING</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Map Fields'}</p>
      <p className="text-xs text-slate-500 mt-1">{mappingCount} field rule{mappingCount !== 1 ? 's' : ''} defined</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}

export function ConditionNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-purple-500/30 hover:border-purple-500/60
      ${selected ? 'ring-1 ring-purple-500/80 shadow-glow-brand border-purple-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <Shuffle size={14} />
        <span>CONDITIONAL</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Check Branch'}</p>
      
      {/* Visual representation of branching handles */}
      <div className="flex justify-between text-[10px] text-slate-500 font-semibold px-4 mt-2">
        <span>TRUE</span>
        <span>FALSE</span>
      </div>

      {/* True / False source handles */}
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="!bg-emerald-500 !border-slate-800" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="!bg-red-500 !border-slate-800" />
    </div>
  );
}

export function ParallelNode({ data, selected }) {
  const nodeCount = data.config?.nodeIds?.length || 0;
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-indigo-500/30 hover:border-indigo-500/60
      ${selected ? 'ring-1 ring-indigo-500/80 border-indigo-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <GitFork size={14} className="rotate-90" />
        <span>PARALLEL GROUP</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Execute Parallel'}</p>
      <p className="text-xs text-slate-500 mt-1">{nodeCount} parallel worker{nodeCount !== 1 ? 's' : ''}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}

export function MergeNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-teal-500/30 hover:border-teal-500/60
      ${selected ? 'ring-1 ring-teal-500/80 border-teal-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-teal-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <GitFork size={14} className="-rotate-90" />
        <span>MERGE OUTPUT</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Merge Outputs'}</p>
      <p className="text-xs text-slate-500 mt-1">Strategy: {data.config?.strategy || 'MERGE_OBJECTS'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}

export function ReturnNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#061c16] border-emerald-500/40 hover:border-emerald-500/70
      ${selected ? 'ring-1 ring-emerald-500 shadow-glow-green' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500" />
      <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs border-b border-slate-900/60 pb-1.5 mb-1.5">
        <LogOut size={14} />
        <span>RETURN RESPONSE</span>
      </div>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm truncate">{data.label || 'Output Response'}</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          HTTP {data.config?.statusCode || 200}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 truncate mt-1">Source: {data.config?.sourceNodeId || 'all outputs'}</p>
    </div>
  );
}

export function RetryNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-orange-500/30 hover:border-orange-500/60
      ${selected ? 'ring-1 ring-orange-500 border-orange-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-orange-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <History size={14} />
        <span>RETRY WRAPPER</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Retry Worker'}</p>
      <p className="text-xs text-slate-500 mt-1">
        Max attempts: {data.config?.maxAttempts || 3} ({data.config?.backoffType || 'exponential'})
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}

export function CacheNode({ data, selected }) {
  const isWrite = data.type === 'CACHE_WRITE';
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-cyan-500/30 hover:border-cyan-500/60
      ${selected ? 'ring-1 ring-cyan-500 border-cyan-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <Database size={14} />
        <span>{isWrite ? 'CACHE WRITE' : 'CACHE CHECK'}</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || (isWrite ? 'Save Cache' : 'Read Cache')}</p>
      <p className="text-[10px] text-slate-500 truncate mt-1">TTL: {data.config?.ttl || 300}s</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}

export function AiAgentNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#110920] border-brand-500/40 hover:border-brand-500/70
      ${selected ? 'ring-1 ring-brand-500 shadow-glow-brand' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-brand-500" />
      <div className="flex items-center space-x-2 text-brand-400 font-semibold text-xs border-b border-slate-900/60 pb-1.5 mb-1.5">
        <Sparkles size={14} />
        <span>GEMINI AI AGENT</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'AI Completion'}</p>
      <p className="text-[10px] text-slate-500 mt-1">Model: {data.config?.model || 'gemini-2.0-flash'}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-brand-500" />
    </div>
  );
}

export function ResponseMapperNode({ data, selected }) {
  return (
    <div className={`
      ${nodeBaseStyles} bg-[#0c1220] border-pink-500/30 hover:border-pink-500/60
      ${selected ? 'ring-1 ring-pink-500 border-pink-500' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className="flex items-center space-x-2 text-pink-400 font-semibold text-xs border-b border-slate-900 pb-1.5 mb-1.5">
        <Settings2 size={14} />
        <span>RESPONSE MAPPER</span>
      </div>
      <p className="font-semibold text-sm truncate">{data.label || 'Format Output'}</p>
      <p className="text-[10px] text-slate-500 mt-1">Shape final response envelope</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
  );
}
