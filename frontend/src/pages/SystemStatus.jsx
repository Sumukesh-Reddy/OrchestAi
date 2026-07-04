import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Database, 
  Network, 
  Server, 
  Cpu, 
  Layers, 
  Loader2, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { api } from '../store/authStore';

export default function SystemStatus() {
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    try {
      const response = await api.get('/health');
      setHealthData(response.data.data);
      setError(null);
    } catch (err) {
      setError('System diagnostics service offline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const getStatusIcon = (status) => {
    if (status === 'UP') return <CheckCircle className="text-emerald-400" size={18} />;
    return <AlertTriangle className="text-red-400 animate-pulse" size={18} />;
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
            <Activity className="text-brand-400" size={28} />
            <span>Diagnostics & Status</span>
          </h1>
          <p className="text-slate-400 mt-1">Real-time health monitor and infrastructure metrics.</p>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchHealth(); }}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold py-2 px-4 rounded-xl transition"
        >
          Force Diagnostic Check
        </button>
      </div>

      {isLoading && !healthData ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center max-w-lg mx-auto border-red-500/20 bg-red-500/5">
          <AlertTriangle className="text-red-400 mx-auto mb-3" size={36} />
          <h2 className="text-lg font-bold text-slate-200">{error}</h2>
          <p className="text-slate-400 text-sm mt-1">
            Ensure backend server is running on port 3000 and MongoDB/Redis are online.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Status & Uptime card */}
          <div className="glass-panel p-6 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">System State</h2>
              <div className="flex items-center space-x-3">
                <span className={`
                  text-2xl font-bold px-3 py-1 rounded-xl border uppercase
                  ${healthData.status === 'UP' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' : 'bg-red-500/5 text-red-400 border-red-500/10'}
                `}>
                  {healthData.status}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Service Uptime:</span>
              <p className="text-base font-semibold text-slate-200">{formatUptime(healthData.uptime)}</p>
            </div>

            <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Version: v{healthData.version || '1.0.0'}</span>
              <span className="capitalize">Environment: {healthData.env}</span>
            </div>
          </div>

          {/* Infrastructure status card */}
          <div className="glass-panel p-6 space-y-5 md:col-span-2">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Infrastructure Dependencies</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="text-slate-400" size={20} />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">MongoDB</p>
                    <p className="text-[10px] text-slate-500">Database</p>
                  </div>
                </div>
                {getStatusIcon(healthData.dependencies?.mongodb)}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Network className="text-slate-400" size={20} />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Redis</p>
                    <p className="text-[10px] text-slate-500">Cache Adapter</p>
                  </div>
                </div>
                {getStatusIcon(healthData.dependencies?.redis)}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Layers className="text-slate-400" size={20} />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">BullMQ</p>
                    <p className="text-[10px] text-slate-500">Queue Manager</p>
                  </div>
                </div>
                {getStatusIcon(healthData.dependencies?.queue)}
              </div>
            </div>

            {/* Performance metrics card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-900/60">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Memory Allocation</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 font-mono text-xs flex justify-between">
                  <span className="text-slate-500">Heap Used:</span>
                  <span className="text-brand-300">
                    {Math.round((healthData.memory?.heapUsed || 0) / 1024 / 1024)} MB
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPU Diagnostics</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 font-mono text-xs flex justify-between">
                  <span className="text-slate-500">System Usage:</span>
                  <span className="text-brand-300">
                    {Math.round((healthData.cpu?.system || 0) / 1000 / 1000)}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
