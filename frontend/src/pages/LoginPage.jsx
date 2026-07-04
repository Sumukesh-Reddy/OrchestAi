import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Starfield from '../components/shared/Starfield';
import { KeyRound, Mail, Loader2, Sparkles, Home } from 'lucide-react';

export default function LoginPage() {
  const { login, user, error, clearError, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If already logged in, redirect to dashboard console
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    return () => clearError();
  }, [user, navigate, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#04060c] flex items-center justify-center p-4 relative overflow-hidden text-slate-200">
      {/* Background Starfield Layer */}
      <Starfield />

      {/* Floating Home Button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 z-20 flex items-center space-x-2 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition duration-200 backdrop-blur-md"
      >
        <Home size={14} />
        <span>Back to Home</span>
      </Link>

      {/* Glassmorphism login card */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-500/15 border border-brand-500/30 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-glow-brand">
            🌀
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Welcome to OrchestAI</h1>
          <p className="text-slate-400 text-sm mt-2 text-center">Low-Code API Orchestration & Workflow Automation</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition duration-250 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition duration-250 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-slate-100 font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-glow-brand transition-all duration-300 hover:scale-[1.01]"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Sparkles size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/40 text-center text-xs">
          <span className="text-slate-500">Need a developer account? </span>
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-semibold transition">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
