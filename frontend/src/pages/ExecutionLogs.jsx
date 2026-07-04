import React, { useEffect, useState } from 'react';
import { 
  FileClock, 
  Search, 
  Filter, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  Eye,
  Activity,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../store/authStore';

export default function ExecutionLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [correlationId, setCorrelationId] = useState('');

  // Selected Log Modal details
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLogLoading, setSelectedLogLoading] = useState(false);

  // AI debugging
  const [aiDebugResult, setAiDebugResult] = useState('');
  const [aiDebugLoading, setAiDebugLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/logs', {
        params: {
          page,
          limit,
          status: status || undefined,
          correlationId: correlationId || undefined,
          executionId: searchQuery || undefined, // Repository search is via text match or route matches
        },
      });
      setLogs(response.data.data.logs);
      setTotal(response.data.data.total);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch execution logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, status, correlationId]);

  const loadLogDetail = async (executionId) => {
    setSelectedLogLoading(true);
    setAiDebugResult('');
    setDetailModalOpen(true);
    try {
      const response = await api.get(`/logs/${executionId}`);
      setSelectedLog(response.data.data.log);
    } catch (err) {
      alert('Failed to retrieve execution details.');
      setDetailModalOpen(false);
    } finally {
      setSelectedLogLoading(false);
    }
  };

  const handleAiDebug = async () => {
    if (!selectedLog) return;
    setAiDebugLoading(true);
    setAiDebugResult('');
    try {
      const response = await api.post(`/logs/${selectedLog.executionId}/debug`);
      setAiDebugResult(response.data.data.analysis);
    } catch (err) {
      alert('AI debugging request failed.');
    } finally {
      setAiDebugLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Execution Telemetry</h1>
        <p className="text-slate-400 mt-1">Trace workflow node executions, evaluate execution durations, and debug failures.</p>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS (2xx)</option>
              <option value="FAILED">FAILED (4xx/5xx)</option>
              <option value="PARTIAL">PARTIAL RUN</option>
            </select>
          </div>

          {/* Search by Correlation ID */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
              placeholder="Filter by Correlation ID..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-300 focus:outline-none w-56"
            />
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="w-full md:w-auto bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold py-2 px-4 rounded-lg transition"
        >
          Refresh Logs
        </button>
      </div>

      {/* Table list */}
      <div className="glass-panel p-6">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Execution ID</th>
                    <th className="pb-3">Route / Endpoint</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Latency</th>
                    <th className="pb-3">Correlation ID</th>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-sm text-slate-300">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-900/10">
                      <td className="py-3.5 pl-2 font-mono text-xs text-brand-300">
                        {log.executionId.substring(0, 16)}...
                      </td>
                      <td className="py-3.5">
                        <span className="font-semibold text-slate-200">
                          {log.apiRouteSlug || 'Direct Trigger'}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                          ${log.status === 'SUCCESS' 
                            ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' 
                            : log.status === 'FAILED' 
                            ? 'bg-red-500/5 text-red-400 border-red-500/10' 
                            : 'bg-yellow-500/5 text-yellow-400 border-yellow-500/10'
                          }
                        `}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-xs">{log.duration} ms</td>
                      <td className="py-3.5 font-mono text-[10px] text-slate-500">
                        {log.correlationId || '-'}
                      </td>
                      <td className="py-3.5 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => loadLogDetail(log.executionId)}
                          className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 hover:text-slate-200 transition"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-900 pt-4 text-xs text-slate-500">
              <span>Showing {logs.length} of {total} trace records</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 border border-slate-800 rounded hover:border-slate-750 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-slate-300">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1 border border-slate-800 rounded hover:border-slate-750 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            No telemetry execution logs matched current filter parameters.
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-[#090d16] border border-slate-800/80 p-8 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <Activity className="text-brand-400" size={20} />
                  <span>Execution Trace Details</span>
                </h2>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">Execution ID: {selectedLog?.executionId}</p>
              </div>
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs px-2.5 py-1.5 border border-slate-800 rounded"
              >
                Close
              </button>
            </div>

            {selectedLogLoading ? (
              <div className="flex-1 flex items-center justify-center h-48">
                <Loader2 className="animate-spin text-brand-500" size={32} />
              </div>
            ) : selectedLog ? (
              <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-y-auto pr-1">
                {/* Steps timeline */}
                <div className="flex-1 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node Execution Steps</h3>
                  
                  {selectedLog.nodeExecutions?.length > 0 ? (
                    <div className="space-y-3 pl-3 border-l border-slate-850">
                      {selectedLog.nodeExecutions.map((exec, idx) => (
                        <div key={idx} className="relative pl-6">
                          {/* Dot marker */}
                          <div className={`
                            absolute left-[-16px] top-1.5 w-3 h-3 rounded-full border-2 bg-slate-950
                            ${exec.status === 'SUCCESS' ? 'border-emerald-500' : exec.status === 'FAILED' ? 'border-red-500' : 'border-yellow-500'}
                          `} />

                          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-200">{exec.nodeLabel || exec.nodeId}</span>
                                <span className="text-[9px] font-semibold bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded ml-2 uppercase">
                                  {exec.nodeType}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{exec.duration} ms</span>
                            </div>

                            {/* Node Input/Output JSON viewer */}
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900/60 text-[10px] font-mono">
                              <div>
                                <span className="text-slate-500">Input config:</span>
                                <pre className="bg-[#04060c] p-1.5 rounded mt-1 overflow-x-auto text-slate-400 max-h-24">
                                  {JSON.stringify(exec.input || {}, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-slate-500">Output data:</span>
                                <pre className="bg-[#04060c] p-1.5 rounded mt-1 overflow-x-auto text-slate-400 max-h-24">
                                  {JSON.stringify(exec.output || exec.error || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No node execution trace recorded.</p>
                  )}
                </div>

                {/* AI debugging details sidebar inside modal */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6 flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Debugging</h3>
                    {selectedLog.status === 'FAILED' && (
                      <button
                        onClick={handleAiDebug}
                        disabled={aiDebugLoading}
                        className="flex items-center space-x-1.5 text-[10px] font-bold bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-300 px-2.5 py-1 rounded transition"
                      >
                        <Sparkles size={11} />
                        <span>Run AI Debug</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto max-h-[300px] text-xs">
                    {aiDebugLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-2">
                        <Loader2 className="animate-spin text-brand-500" size={24} />
                        <span className="text-[10px] text-slate-500">Analyzing execution log steps...</span>
                      </div>
                    ) : aiDebugResult ? (
                      <pre className="text-[11px] font-sans text-brand-300 whitespace-pre-wrap leading-relaxed">
                        {aiDebugResult}
                      </pre>
                    ) : (
                      <span className="text-slate-500 italic">
                        {selectedLog.status === 'SUCCESS' 
                          ? 'This workflow execution completed successfully. No debugging required!' 
                          : 'Trigger AI Debug to diagnose node failures and obtain suggestions.'
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
