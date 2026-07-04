import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Starfield from '../components/shared/Starfield';
import { Mail, KeyRound, User, Loader2, Sparkles, ShieldCheck, Home } from 'lucide-react';
import { api } from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Verification screen states
  const [showVerify, setShowVerify] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', { email, password, firstName, lastName });
      setShowVerify(true);
      setVerifyMessage(`A 6-digit code has been dispatched to ${email}. If using standard offline defaults, check backend task terminal logs.`);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || 'Signup registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) return;

    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify', { email, code: verificationCode });
      alert('Email verified successfully! You can now log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || 'Verification failed. Invalid or expired code.');
    } finally {
      setIsLoading(false);
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

      {/* Glassmorphism Card */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-brand-500/15 border border-brand-500/30 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-glow-brand">
            🌀
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            {showVerify ? 'Verify Email Address' : 'Create Developer Account'}
          </h1>
          <p className="text-slate-400 text-xs mt-1 text-center">
            {showVerify ? 'Enter the security code to activate your console session' : 'Sign up to build orchestration logic workflows'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        {showVerify ? (
          /* VERIFICATION CODE FORM SCREEN */
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-xs text-brand-300 leading-relaxed">
              {verifyMessage}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verification Code</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-center font-mono text-lg tracking-widest text-slate-100 placeholder-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-slate-100 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-glow-brand transition"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <span>Verify Account</span>}
            </button>
          </form>
        ) : (
          /* USER SIGNUP REGISTRATION SCREEN */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="user"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="last name"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-slate-100 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-glow-brand transition"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Register & Verify</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-850 text-center text-xs">
          <span className="text-slate-500">Already registered? </span>
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
