import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useApiRouteStore } from '../store/apiRouteStore';
import { api } from '../store/authStore';
import { 
  GitFork, 
  Link2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Activity, 
  ChevronRight, 
  Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { workflows, fetchWorkflows } = useWorkflowStore();
  const { routes, fetchRoutes } = useApiRouteStore();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows({ limit: 5 });
    fetchRoutes({ limit: 5 });

    const loadStatsAndLogs = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.get('/logs/stats'),
          api.get('/logs', { params: { limit: 5 } }),
        ]);
        setStats(statsRes.data.data.stats);
        setRecentLogs(logsRes.data.data.logs);
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatsAndLogs();
  }, [fetchWorkflows, fetchRoutes]);

  // Formats time series data for the graph
  const chartData = stats?.dailyStats?.map((s) => ({
    date: s._id.date,
    count: s.count,
    status: s._id.status,
  })) || [];

  // Group chart counts by date
  const chartDataGrouped = Object.values(
    chartData.reduce((acc, current) => {
      if (!acc[current.date]) {
        acc[current.date] = { date: current.date, Requests: 0 };
      }
      acc[current.date].Requests += current.count;
      return acc;
    }, {})
  ).slice(-7); // Keep last 7 days

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">System Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time health, execution statistics, and status metrics.</p>
        </div>
        <Link
          to="/ai"
          className="group flex items-center space-x-2 bg-gradient-to-r from-amber-600/10 to-yellow-600/10 border border-amber-500/20 hover:border-amber-500/50 text-amber-300 py-2 px-4 rounded-xl text-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        >
          <Sparkles size={16} className="text-amber-400 group-hover:scale-110 transition-transform duration-200" />
          <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent font-medium">Ask AI Assistant</span>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-6 flex items-center space-x-5">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
            <GitFork size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workflows</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{workflows.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center space-x-5">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Link2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exposed Routes</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{routes.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center space-x-5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {stats ? `${stats.successRate}%` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center space-x-5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {stats ? `${stats.avgDuration} ms` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Graph */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Execution Frequency (Last 7 Days)</h2>
          <div className="h-64 w-full">
            {chartDataGrouped.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataGrouped} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                    itemStyle={{ color: '#c084fc', fontSize: '13px' }}
                  />
                  <Area type="monotone" dataKey="Requests" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRequests)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No telemetry logs found in current range.
              </div>
            )}
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="glass-panel p-6 flex flex-col space-y-5 justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-200">System Activity Status</h2>
            <p className="text-xs text-slate-500 mt-1">Aggregated results by HTTP status</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Successful (2xx)</span>
              </span>
              <span className="font-semibold text-slate-200">{stats?.byStatus?.SUCCESS || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Failed (4xx/5xx)</span>
              </span>
              <span className="font-semibold text-slate-200">{stats?.byStatus?.FAILED || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span>Partially Executed</span>
              </span>
              <span className="font-semibold text-slate-200">{stats?.byStatus?.PARTIAL || 0}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Activity size={14} className="text-emerald-500 animate-pulse" />
              <span>Platform Health: Excellent</span>
            </div>
            <Link to="/status" className="text-brand-400 hover:text-brand-300 text-xs font-semibold flex items-center space-x-1">
              <span>Diagnostics</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Execution Logs */}
      <div className="glass-panel p-6 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 font-sans">Recent API Executions</h2>
          <Link to="/logs" className="text-brand-400 hover:text-brand-300 text-xs font-semibold flex items-center space-x-0.5">
            <span>View All Logs</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3">Execution ID</th>
                  <th className="pb-3">Route Slug</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-sm text-slate-300">
                {recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/10">
                    <td className="py-3 font-mono text-xs text-brand-300">
                      {log.executionId.substring(0, 18)}...
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-200">
                        {log.apiRouteSlug || 'Direct Execution'}
                      </span>
                    </td>
                    <td className="py-3">
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
                    <td className="py-3 font-mono text-xs">{log.duration} ms</td>
                    <td className="py-3 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-sm">
            No execution history found yet. Expose an API route and make a request to start tracking logs!
          </div>
        )}
      </div>
    </div>
  );
}
