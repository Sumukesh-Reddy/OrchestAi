import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  GitFork, 
  Link2, 
  KeyRound, 
  FileClock, 
  Settings, 
  Sparkles, 
  LogOut, 
  User, 
  Menu,
  X,
  Activity,
  Zap,
  BookOpen
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workflows', path: '/workflows', icon: GitFork },
    { name: 'API Routes', path: '/routes', icon: Link2 },
    { name: 'API Keys', path: '/keys', icon: KeyRound },
    { name: 'Execution Logs', path: '/logs', icon: FileClock },
    { name: 'API Tester', path: '/tester', icon: Zap },
    { name: 'AI Assistant', path: '/ai', icon: Sparkles },
    { name: 'Node Guide', path: '/guide', icon: BookOpen },
    { name: 'System Status', path: '/status', icon: Activity },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#060814] flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md px-4 py-3 flex items-center justify-between text-slate-100 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🌀</span>
          <span className="font-semibold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-indigo-400">OrchestAI</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#090d16]/95 border-r border-slate-800/60 z-50 transform transition-transform duration-300 md:translate-x-0 md:relative md:flex md:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center space-x-2 border-b border-slate-900">
          <span className="text-2xl animate-spin-slow">🌀</span>
          <span className="font-bold text-xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-brand-500 to-indigo-400">OrchestAI</span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const ActiveIcon = item.icon;
            const active = isActive(item.path);
            const isAi = item.name === 'AI Assistant';
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${active 
                    ? (isAi 
                        ? 'bg-amber-500/10 border-l-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] font-semibold' 
                        : 'bg-brand-500/10 text-brand-300 border-l-2 border-brand-500 shadow-glow-brand font-semibold'
                      ) 
                    : (isAi 
                        ? 'text-slate-400 hover:bg-amber-500/5' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                      )
                  }
                `}
              >
                <ActiveIcon 
                  size={18} 
                  className={active 
                    ? (isAi ? 'text-amber-400' : 'text-brand-400') 
                    : (isAi ? 'text-amber-500/50 group-hover:text-amber-400' : 'text-slate-400 group-hover:text-slate-100')
                  } 
                />
                <span className={isAi ? 'bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent font-semibold drop-shadow-[0_0_8px_rgba(245,158,11,0.15)]' : ''}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-900 flex flex-col space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold">
              {user?.firstName?.[0] || <User size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-800/80 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Topbar header */}
        <header className="hidden md:flex items-center justify-end h-16 bg-[#060814]/40 border-b border-slate-900/60 px-8 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-4">
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
