import React, { useEffect, useState } from 'react';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  Copy, 
  ShieldAlert, 
  CheckCircle,
  Loader2,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../store/authStore';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealedKeys, setRevealedKeys] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [scopes, setScopes] = useState(['read', 'execute']);

  const [newKeyDetails, setNewKeyDetails] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState(null);

  const handleCopyPrefix = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedRowId(id);
    setTimeout(() => setCopiedRowId(null), 2000);
  };

  const toggleReveal = (id) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/keys');
      setKeys(response.data.data.keys);
    } catch (err) {
      setError('Failed to fetch API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/keys', { label, description, scopes });
      setNewKeyDetails(response.data.data);
      fetchKeys();
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to generate API key');
    }
  };

  const handleRevoke = async (id) => {
    if (window.confirm('Are you sure you want to revoke this API key? This operation is irreversible.')) {
      try {
        await api.delete(`/keys/${id}`);
        fetchKeys();
      } catch (err) {
        alert('Failed to revoke API key.');
      }
    }
  };

  const handleCopy = () => {
    if (newKeyDetails?.rawKey) {
      navigator.clipboard.writeText(newKeyDetails.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Developer API Keys</h1>
          <p className="text-slate-400 mt-1">Generate credentials to call user exposed dynamic APIs programmatically.</p>
        </div>
        <button
          onClick={() => {
            setNewKeyDetails(null);
            setLabel('');
            setDescription('');
            setScopes(['read', 'execute']);
            setModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium py-2.5 px-4 rounded-xl shadow-glow-brand transition duration-200"
        >
          <Plus size={18} />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* Main Grid Panel */}
      <div className="glass-panel p-6">
        {isLoading && keys.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        ) : keys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-4 pl-2">Key Label</th>
                  <th className="pb-4">API Key</th>
                  <th className="pb-4">Allowed Scopes</th>
                  <th className="pb-4">API Key Usage</th>
                  <th className="pb-4">Last Used</th>
                  <th className="pb-4 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-sm text-slate-300">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-900/10">
                    <td className="py-4 pl-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{k.label}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">{k.description}</span>
                      </div>
                    </td>
                    <td className="py-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 truncate">
                          {revealedKeys[k.id]
                            ? (k.rawKey || `${k.prefix}*** (legacy key)`)
                            : `${k.prefix}${'•'.repeat(20)}`}
                        </span>
                        <button
                          onClick={() => toggleReveal(k.id)}
                          title={revealedKeys[k.id] ? 'Hide' : 'Reveal full key'}
                          className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition shrink-0"
                        >
                          {revealedKeys[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                          onClick={() => handleCopyPrefix(k.rawKey || k.prefix, k.id)}
                          title="Copy full key"
                          className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition shrink-0"
                        >
                          {copiedRowId === k.id
                            ? <CheckCircle size={12} className="text-emerald-400" />
                            : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/10 uppercase">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 font-mono text-xs text-slate-400">
                      {k.usageCount} request{k.usageCount !== 1 ? 's' : ''}
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never used'}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button
                        onClick={() => handleRevoke(k.id)}
                        title="Revoke API Key"
                        className="p-2 bg-slate-950 border border-red-500/10 text-red-500 rounded hover:bg-red-500/5 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            No API Keys generated yet. Click "Generate API Key" to authorize custom external queries.
          </div>
        )}
      </div>

      {/* Generation Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#090d16] border border-slate-800/80 p-8 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2 mb-2">
              <KeyRound className="text-brand-400" size={22} />
              <span>Generate API Key</span>
            </h2>
            <p className="text-slate-400 text-sm mb-6">Create a secure credential for external integrations.</p>

            {newKeyDetails ? (
              // Display Raw Key screen
              <div className="space-y-6">
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-yellow-400 flex items-start space-x-3 text-xs leading-relaxed">
                  <ShieldAlert className="shrink-0 mt-0.5" size={18} />
                  <div>
                    <span className="font-bold">CRITICAL WARNING: </span>
                    Copy this key now. It will NOT be shown again. Anyone with access to this key can run your workflows.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw API Key</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl font-mono text-xs text-brand-300 select-all truncate">
                      {newKeyDetails.rawKey}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-100 hover:border-slate-700 transition"
                    >
                      {copied ? <CheckCircle className="text-emerald-500" size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900 flex justify-end">
                  <button
                    onClick={() => {
                      setNewKeyDetails(null);
                      setModalOpen(false);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm bg-brand-600 hover:bg-brand-500 font-medium text-white transition shadow-glow-brand"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              // Generator Config form
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Name/Label</label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Production Webhook Client"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe where and how this key will be used..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scopes / Privileges</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes('read')}
                        onChange={(e) => {
                          if (e.target.checked) setScopes([...scopes, 'read']);
                          else setScopes(scopes.filter((s) => s !== 'read'));
                        }}
                        className="rounded bg-slate-900 border-slate-800 text-brand-500"
                      />
                      <span>read (Metadata)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes('execute')}
                        onChange={(e) => {
                          if (e.target.checked) setScopes([...scopes, 'execute']);
                          else setScopes(scopes.filter((s) => s !== 'execute'));
                        }}
                        className="rounded bg-slate-900 border-slate-800 text-brand-500"
                      />
                      <span>execute (API Run)</span>
                    </label>
                  </div>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm border border-slate-800 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-sm bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium transition"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
