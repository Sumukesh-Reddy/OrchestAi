import React, { useEffect, useState } from 'react';
import { useApiRouteStore } from '../store/apiRouteStore';
import { useWorkflowStore } from '../store/workflowStore';
import { 
  Link2, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  ShieldAlert, 
  CheckCircle,
  Loader2,
  HelpCircle,
  Copy
} from 'lucide-react';

export default function ApiRoutes() {
  const { routes, fetchRoutes, createRoute, updateRoute, deleteRoute, testRoute, isLoading, error } = useApiRouteStore();
  const { workflows, fetchWorkflows } = useWorkflowStore();

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingRoute, setTestingRoute] = useState(null);

  // Form states
  const [slug, setSlug] = useState('');
  const [method, setMethod] = useState('POST');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [authStrategy, setAuthStrategy] = useState('NONE');
  const [workflowId, setWorkflowId] = useState('');
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [rateLimitMax, setRateLimitMax] = useState(100);
  const [cacheEnabled, setCacheEnabled] = useState(false);
  const [cacheTtl, setCacheTtl] = useState(300);
  const [cacheKeyTemplate, setCacheKeyTemplate] = useState('');

  // Test payload states
  const [testBody, setTestBody] = useState('{}');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchWorkflows({ limit: 100 });
  }, [fetchRoutes, fetchWorkflows]);

  const openCreateModal = () => {
    setEditingRoute(null);
    setSlug('');
    setMethod('POST');
    setPath('');
    setDescription('');
    setAuthStrategy('NONE');
    setWorkflowId(workflows[0]?._id || '');
    setRateLimitEnabled(false);
    setRateLimitMax(100);
    setCacheEnabled(false);
    setCacheTtl(300);
    setCacheKeyTemplate('');
    setRouteModalOpen(true);
  };

  const openEditModal = (route) => {
    setEditingRoute(route);
    setSlug(route.slug);
    setMethod(route.method);
    setPath(route.path);
    setDescription(route.description || '');
    setAuthStrategy(route.authStrategy || 'NONE');
    setWorkflowId(route.workflowId?._id || route.workflowId || '');
    setRateLimitEnabled(route.rateLimit?.enabled || false);
    setRateLimitMax(route.rateLimit?.max || 100);
    setCacheEnabled(route.cacheConfig?.enabled || false);
    setCacheTtl(route.cacheConfig?.ttl || 300);
    setCacheKeyTemplate(route.cacheConfig?.keyTemplate || '');
    setRouteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      slug,
      method,
      path,
      description,
      authStrategy,
      workflowId,
      rateLimit: { enabled: rateLimitEnabled, windowMs: 60000, max: rateLimitMax },
      cacheConfig: { enabled: cacheEnabled, ttl: cacheTtl, keyTemplate: cacheKeyTemplate },
    };

    let result;
    if (editingRoute) {
      result = await updateRoute(editingRoute._id, payload);
    } else {
      result = await createRoute(payload);
    }

    if (result) {
      setRouteModalOpen(false);
      fetchRoutes();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate and delete this API route?')) {
      await deleteRoute(id);
    }
  };

  const handleTestRun = async (e) => {
    e.preventDefault();
    setTestLoading(true);
    try {
      const parsedBody = JSON.parse(testBody);
      const result = await testRoute(testingRoute._id, parsedBody);
      setTestResult(result);
    } catch (err) {
      alert('Invalid JSON test body.');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Exposed API Routes</h1>
          <p className="text-slate-400 mt-1">Configure paths, authentication mechanisms, and cache behaviors for exposed endpoints.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium py-2.5 px-4 rounded-xl shadow-glow-brand transition duration-200"
        >
          <Plus size={18} />
          <span>Expose New Route</span>
        </button>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel p-6">
        {isLoading && routes.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        ) : routes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-4 pl-2">API Details</th>
                  <th className="pb-4">Mount Path</th>
                  <th className="pb-4">Linked Workflow</th>
                  <th className="pb-4">Authentication</th>
                  <th className="pb-4">Rate Limit</th>
                  <th className="pb-4 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-sm text-slate-300">
                {routes.map((route) => (
                  <tr key={route._id} className="hover:bg-slate-900/10">
                    <td className="py-4 pl-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{route.slug}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">{route.description}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`
                          text-[10px] font-bold px-2 py-0.5 rounded border uppercase
                          ${route.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                        `}>
                          {route.method}
                        </span>
                        <span className="font-mono text-xs text-brand-300">/api/v1/exposed{route.path}</span>
                      </div>
                    </td>
                    <td className="py-4 text-xs font-semibold">
                      {route.workflowId?.name || 'Loading...'}
                    </td>
                    <td className="py-4 text-xs">
                      <span className={`
                        inline-flex items-center px-2 py-0.5 rounded-full border
                        ${route.authStrategy === 'NONE' ? 'bg-slate-800/40 text-slate-400 border-slate-700/20' : 'bg-brand-500/10 text-brand-300 border-brand-500/10'}
                      `}>
                        {route.authStrategy}
                      </span>
                    </td>
                    <td className="py-4 text-xs text-slate-400 font-mono">
                      {route.rateLimit?.enabled ? `${route.rateLimit.max} req/min` : 'Off'}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setTestingRoute(route);
                            setTestBody('{\n  "pan": "ABCDE1234F",\n  "userId": 1\n}');
                            setTestResult(null);
                            setTestModalOpen(true);
                          }}
                          title="Run Test Request"
                          className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 hover:text-slate-200 transition"
                        >
                          <Play size={14} className="text-emerald-500" />
                        </button>
                        <button
                          onClick={() => openEditModal(route)}
                          title="Edit Config"
                          className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 hover:text-slate-200 transition"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(route._id)}
                          title="Delete Route"
                          className="p-2 bg-slate-950 border border-red-500/10 text-red-500 rounded hover:bg-red-500/5 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            No API endpoints have been exposed yet. Create a workflow first, then map it to a public endpoint route here.
          </div>
        )}
      </div>

      {/* Config Form Modal */}
      {routeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#090d16] border border-slate-800/80 p-8 rounded-2xl shadow-2xl my-8">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2 mb-2">
              <Link2 className="text-brand-400" size={22} />
              <span>{editingRoute ? 'Edit API Route' : 'Expose New API Route'}</span>
            </h2>
            <p className="text-slate-400 text-sm mb-6">Link a published workflow to an exposed REST endpoint.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100"
                  >
                    {['POST', 'GET', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Slug Name (Unique)</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. kyc-enrichment"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Path Expression</label>
                <input
                  type="text"
                  required
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. /kyc/verify"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow Mapping</label>
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100"
                >
                  {workflows.map((flow) => (
                    <option key={flow._id} value={flow._id}>{flow.name} (v{flow.currentVersion})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auth Strategy</label>
                <select
                  value={authStrategy}
                  onChange={(e) => setAuthStrategy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100"
                >
                  <option value="NONE">NONE (Public Endpoint)</option>
                  <option value="API_KEY">API_KEY Header Strategy</option>
                  <option value="JWT">JWT Bearer Authorization</option>
                </select>
              </div>

              {/* Rate Limiting Toggles */}
              <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-900">
                <input
                  type="checkbox"
                  id="rateLimitToggle"
                  checked={rateLimitEnabled}
                  onChange={(e) => setRateLimitEnabled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-brand-500 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <label htmlFor="rateLimitToggle" className="text-xs font-semibold text-slate-300">Enable Route Rate Limiting</label>
                  <p className="text-[10px] text-slate-500">Throttles requests dynamically per IP</p>
                </div>
                {rateLimitEnabled && (
                  <input
                    type="number"
                    value={rateLimitMax}
                    onChange={(e) => setRateLimitMax(parseInt(e.target.value))}
                    className="w-20 bg-[#090d16] border border-slate-800 rounded py-1 px-2 text-xs font-mono text-slate-200 text-center"
                  />
                )}
              </div>

              {/* Caching Toggles */}
              <div className="flex flex-col space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-900">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="cacheToggle"
                    checked={cacheEnabled}
                    onChange={(e) => setCacheEnabled(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-800 text-brand-500 focus:ring-brand-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="cacheToggle" className="text-xs font-semibold text-slate-300">Enable Cache Layer</label>
                    <p className="text-[10px] text-slate-500">Cache full response outputs</p>
                  </div>
                </div>
                {cacheEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900/60">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-500">TTL (seconds)</label>
                      <input
                        type="number"
                        value={cacheTtl}
                        onChange={(e) => setCacheTtl(parseInt(e.target.value))}
                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg py-1 px-3 text-xs text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-500">Key Template</label>
                      <input
                        type="text"
                        value={cacheKeyTemplate}
                        onChange={(e) => setCacheKeyTemplate(e.target.value)}
                        placeholder="e.g. user:{{body.userId}}"
                        className="w-full bg-[#090d16] border border-slate-800 rounded-lg py-1 px-3 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setRouteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm border border-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium transition"
                >
                  Save Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Testing Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800/80 p-8 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2 mb-2">
              <Play className="text-emerald-400 animate-pulse" size={22} />
              <span>Test API Route: {testingRoute?.slug}</span>
            </h2>
            <p className="text-slate-400 text-sm mb-6">Submit JSON payload to invoke the linked workflow and review raw outputs.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 pr-1 pb-4">
              {/* Test payload editor */}
              <form onSubmit={handleTestRun} className="flex flex-col space-y-4">
                <div className="space-y-1 flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Request Body (JSON)</label>
                  <textarea
                    required
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    rows={8}
                    className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-slate-100 focus:outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={testLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-100 font-medium py-2.5 rounded-xl flex items-center justify-center space-x-2"
                >
                  {testLoading ? <Loader2 className="animate-spin" size={18} /> : <span>Execute Test Run</span>}
                </button>
              </form>

              {/* Test output screen */}
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Response Details</label>
                <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto max-h-[300px]">
                  {testResult ? (
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-xs text-slate-600 italic">No output yet. Trigger run query.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-900 mt-4">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="px-5 py-2 rounded-xl text-sm border border-slate-800 text-slate-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
