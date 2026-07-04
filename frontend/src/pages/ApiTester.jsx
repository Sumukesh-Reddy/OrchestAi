import React, { useEffect, useState, useRef } from 'react';
import {
  Zap, Send, Copy, CheckCircle, ChevronDown, Loader2,
  Plus, Trash2, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { api } from '../store/authStore';

const METHOD_COLORS = {
  GET:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  POST:   'text-blue-400   bg-blue-400/10   border-blue-400/20',
  PUT:    'text-amber-400  bg-amberted-400/10 border-amber-400/20',
  PATCH:  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  DELETE: 'text-red-400    bg-red-400/10    border-red-400/20',
};

export default function ApiTester() {
  const [routes,  setRoutes]  = useState([]);
  const [apiKeys, setApiKeys] = useState([]);

  // Request state
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedKey,   setSelectedKey]   = useState('');
  const [customUrl,     setCustomUrl]      = useState('');
  const [method,        setMethod]         = useState('POST');
  const [bodyText,      setBodyText]       = useState('{\n  \n}');
  const [headers,       setHeaders]        = useState([
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);

  // Response state
  const [response,    setResponse]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [duration,    setDuration]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('body');
  const [copiedResp,  setCopiedResp]  = useState(false);

  // History — persisted to localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('api_tester_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api.get('/routes').then(r  => setRoutes(r.data.data.routes || [])).catch(() => {});
    api.get('/keys').then(r => setApiKeys(r.data.data.keys   || [])).catch(() => {});
  }, []);

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setMethod(route.method);
    setCustomUrl(`/api/v1/exposed${route.path}`);
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    const start = Date.now();

    try {
      const url = customUrl || (selectedRoute ? `/api/v1/exposed${selectedRoute.path}` : '');
      if (!url) { alert('Please select a route or enter a URL.'); setLoading(false); return; }

      const reqHeaders = {};
      headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = h.value; });
      if (selectedKey) reqHeaders['X-API-Key'] = selectedKey;

      let parsedBody = null;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try { parsedBody = JSON.parse(bodyText); } catch { parsedBody = bodyText; }
      }

      // Use fetch directly so we can hit the backend server (same origin)
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: parsedBody ? JSON.stringify(parsedBody) : undefined,
      });

      const ms = Date.now() - start;
      setDuration(ms);

      let data;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const respObj = { status: res.status, ok: res.ok, data, headers: Object.fromEntries(res.headers.entries()) };
      setResponse(respObj);
      setHistory(prev => {
        const next = [{ url, method, status: res.status, ms, ts: new Date().toISOString() }, ...prev.slice(0, 9)];
        localStorage.setItem('api_tester_history', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      const ms = Date.now() - start;
      setDuration(ms);
      setResponse({ status: 0, ok: false, data: { error: err.message }, headers: {} });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response?.data, null, 2));
    setCopiedResp(true);
    setTimeout(() => setCopiedResp(false), 2000);
  };

  const addHeader = () => setHeaders(h => [...h, { key: '', value: '', enabled: true }]);
  const removeHeader = (i) => setHeaders(h => h.filter((_, idx) => idx !== i));
  const updateHeader = (i, field, val) => setHeaders(h => h.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const statusColor = (s) => {
    if (!s) return 'text-slate-500';
    if (s >= 200 && s < 300) return 'text-emerald-400';
    if (s >= 400) return 'text-red-400';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
          <Zap className="text-brand-400" size={28} />
          API Tester
        </h1>
        <p className="text-slate-400 mt-1">Test your exposed API routes directly — no external tools needed.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* LEFT: Request Builder */}
        <div className="xl:col-span-3 space-y-4">

          {/* URL Bar */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex gap-3 items-center">
              {/* Method picker */}
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
              >
                {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
              </select>

              {/* URL input */}
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="e.g. /api/v1/exposed/kyc"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
              />

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-xl shadow-glow-brand transition text-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Route + Key selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Quick Route Select</label>
                <select
                  onChange={e => {
                    const r = routes.find(r => r._id === e.target.value);
                    if (r) handleRouteSelect(r);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— pick a route —</option>
                  {routes.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.method} {r.path} ({r.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  API Key (X-API-Key) — paste your full key
                </label>
                <input
                  type="text"
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  placeholder="ak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-500 placeholder-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Tabs: Body / Headers */}
          <div className="glass-panel overflow-hidden">
            <div className="flex border-b border-slate-900">
              {['body', 'headers'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                    activeTab === tab
                      ? 'text-brand-400 border-b-2 border-brand-500 bg-slate-900/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}{tab === 'headers' && ` (${headers.filter(h=>h.enabled&&h.key).length})`}
                </button>
              ))}
            </div>

            {activeTab === 'body' && (
              <div className="p-4">
                {['POST','PUT','PATCH'].includes(method) ? (
                  <textarea
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    rows={10}
                    spellCheck={false}
                    className="w-full bg-slate-950 border border-slate-900 rounded-xl p-4 text-sm font-mono text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                    placeholder='{\n  "key": "value"\n}'
                  />
                ) : (
                  <div className="py-8 text-center text-slate-600 text-sm">
                    {method} requests do not have a body.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="p-4 space-y-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={e => updateHeader(i, 'enabled', e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-brand-500"
                    />
                    <input
                      value={h.key}
                      onChange={e => updateHeader(i, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-500"
                    />
                    <input
                      value={h.value}
                      onChange={e => updateHeader(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-500"
                    />
                    <button onClick={() => removeHeader(i)} className="text-slate-600 hover:text-red-400 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addHeader}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mt-2 transition"
                >
                  <Plus size={13} /> Add Header
                </button>
              </div>
            )}
          </div>

          {/* Response Panel */}
          {response && (
            <div className="glass-panel overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-900 bg-slate-900/20">
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold ${statusColor(response.status)}`}>
                    {response.status || 'ERR'}
                  </span>
                  <span className="text-xs text-slate-500">{duration}ms</span>
                  {response.ok
                    ? <CheckCircle2 size={14} className="text-emerald-400" />
                    : <XCircle size={14} className="text-red-400" />
                  }
                </div>
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedResp ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copiedResp ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-5 text-xs font-mono text-slate-300 overflow-auto max-h-96 leading-relaxed bg-slate-950/40">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* RIGHT: History */}
        <div className="space-y-4">
          <div className="glass-panel p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={13} /> Recent Requests
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No requests yet. Hit Send to start.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setMethod(h.method); setCustomUrl(h.url); }}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-900 transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${METHOD_COLORS[h.method] || 'text-slate-400'} px-1.5 py-0.5 rounded border`}>
                        {h.method}
                      </span>
                      <span className={`text-[10px] font-bold ${statusColor(h.status)}`}>{h.status}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 truncate">{h.url}</p>
                    <p className="text-[10px] text-slate-600">{h.ms}ms · {new Date(h.ts).toLocaleTimeString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
