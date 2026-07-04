import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Starfield from '../components/shared/Starfield';
import { 
  GitFork, 
  Globe, 
  Settings2, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Zap,
  Activity,
  Code2,
  Terminal,
  Cpu,
  Layers,
  FileCode,
  Gauge,
  Workflow,
  Server,
  Lock,
  RefreshCw,
  GitBranch,
  FileJson,
  Container,
  GitPullRequest
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);

  return (
    <div className="relative min-h-screen bg-[#030611] text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans selection:bg-brand-500/30 selection:text-brand-200">
      {/* Space Starfield Backdrop */}
      <Starfield />

      {/* Header/Navbar */}
      <header className="relative z-10 w-full h-20 px-6 md:px-12 flex items-center justify-between border-b border-slate-900/60 backdrop-blur-md sticky top-0">
        <div className="flex items-center space-x-2.5">
          <span className="text-2xl animate-spin-slow">🌀</span>
          <span className="font-bold text-xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-brand-500 to-indigo-400">OrchestrAI</span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-slate-100 transition duration-200">Features</a>
          <a href="#workflow" className="hover:text-slate-100 transition duration-200">How It Works</a>
          <a href="#architecture" className="hover:text-slate-100 transition duration-200">Architecture</a>
          <a href="#developers" className="hover:text-slate-100 transition duration-200">Developers</a>
        </div>

        <div className="flex items-center space-x-4">
          {token ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/20 text-brand-300 font-semibold py-2 px-5 rounded-xl text-sm transition shadow-glow-brand"
            >
              Console Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="text-slate-400 hover:text-slate-100 text-sm font-semibold transition duration-200">
                Sign In
              </Link>
              <button
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold py-2 px-5 rounded-xl text-sm shadow-glow-brand transition duration-300 hover:scale-[1.01]"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 pt-16 md:pt-28 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column Text */}
        <div className="lg:col-span-7 space-y-6 text-left">

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-slate-100">
            Build Enterprise API Workflows <br />
            Without Writing <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-purple-500 to-pink-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.35)]">Integration Code</span>
          </h1>

          <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl">
            OrchestrAI enables engineering teams to design, orchestrate, and deploy production-ready API workflows using visual configurations instead of custom backend logic.
          </p>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl">
            Create reusable workflows, connect multiple external APIs, transform payloads, execute requests in parallel, cache responses, and monitor everything from a unified dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button
              onClick={() => navigate(token ? '/dashboard' : '/signup')}
              className="w-full sm:w-auto bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-slate-100 font-semibold py-3.5 px-7 rounded-xl flex items-center justify-center space-x-2 shadow-glow-brand transition duration-300 hover:scale-[1.01]"
            >
              <span>Start Building</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-slate-900/40 backdrop-blur border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-slate-100 font-semibold py-3.5 px-7 rounded-xl transition"
            >
              View Live Demo
            </button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-6 border-t border-slate-900/40 max-w-xl text-xs text-slate-400 font-medium">
            <span className="flex items-center space-x-1.5"><span className="text-brand-400">✓</span> <span>Visual Workflow Builder</span></span>
            <span className="flex items-center space-x-1.5"><span className="text-brand-400">✓</span> <span>JWT & API Keys</span></span>
            <span className="flex items-center space-x-1.5"><span className="text-brand-400">✓</span> <span>Parallel Execution</span></span>
            <span className="flex items-center space-x-1.5"><span className="text-brand-400">✓</span> <span>AI Workflow Generator</span></span>
            <span className="flex items-center space-x-1.5"><span className="text-brand-400">✓</span> <span>Metrics & Monitoring</span></span>
            <span className="flex items-center space-x-1.5"><span className="text-brand-400">✓</span> <span>Docker Ready</span></span>
          </div>
        </div>

        {/* Right Column Orb & floating nodes */}
        <div className="lg:col-span-5 relative flex items-center justify-center h-[350px] lg:h-[450px]">
          {/* Concentric rotating dash ring */}
          <div className="absolute w-72 h-72 rounded-full border border-dashed border-brand-500/20 animate-spin-slow flex items-center justify-center">
            <div className="absolute top-0 w-9 h-9 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-center text-blue-400 shadow-md">
              <Globe size={15} />
            </div>
            <div className="absolute right-0 w-9 h-9 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-center text-purple-400 shadow-md">
              <Sparkles size={15} />
            </div>
            <div className="absolute bottom-0 w-9 h-9 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-center text-emerald-400 shadow-md">
              <Database size={15} />
            </div>
            <div className="absolute left-0 w-9 h-9 bg-[#0b0f19] border border-slate-800 rounded-xl flex items-center justify-center text-amber-400 shadow-md">
              <ShieldCheck size={15} />
            </div>
          </div>

          <div className="absolute w-48 h-48 rounded-full border border-dashed border-indigo-500/10 animate-spin-counter" />

          {/* Central Blue Glowing Orb */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 p-0.5 shadow-[0_0_50px_rgba(139,92,246,0.3)] flex items-center justify-center z-10 animate-pulse">
            <div className="w-full h-full rounded-full bg-[#080c14] flex items-center justify-center text-3xl">
              🌀
            </div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 py-20 md:py-28 text-center space-y-16">
        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything Needed to Build Enterprise API Workflows</h2>
          <p className="text-slate-400 text-sm md:text-base">
            A complete platform for configuring, executing, monitoring, and scaling API orchestrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Workflow, title: 'Visual Workflow Editor', desc: 'Design complex API pipelines using drag-and-drop workflow nodes without writing backend logic.' },
            { icon: Globe, title: 'Dynamic API Builder', desc: 'Expose custom REST APIs from configurable workflows in seconds.' },
            { icon: Code2, title: 'Request & Response Mapping', desc: 'Transform payloads between client requests and vendor APIs using configurable mappings.' },
            { icon: Lock, title: 'Authentication', desc: 'Secure workflows using JWT, API Keys, OAuth-ready architecture, and role-based access control.' },
            { icon: Cpu, title: 'Parallel Execution', desc: 'Execute multiple downstream APIs simultaneously using BullMQ workers and intelligent orchestration.' },
            { icon: Database, title: 'Caching Engine', desc: 'Reduce latency with Redis-backed caching and configurable expiration policies.' },
            { icon: Gauge, title: 'Observability', desc: 'Monitor requests with logs, metrics, execution history, health checks, and Prometheus endpoints.' },
            { icon: Sparkles, title: 'AI Workflow Assistant', desc: 'Describe your workflow in plain English and let Gemini generate the orchestration configuration automatically.' }
          ].map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div key={i} className="glass-panel p-6 text-left flex flex-col justify-between hover:border-brand-500/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.05)] transition-all duration-300">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-brand-400">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{feat.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflow Steps Section */}
      <section id="workflow" className="relative z-10 bg-slate-950/20 py-20 border-y border-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center space-y-16">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">How OrchestrAI Works</h2>
            <p className="text-slate-400 text-sm">Deploy high-performance APIs in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              { step: '01', title: 'Design Workflow', desc: 'Create visual workflows using reusable execution nodes.' },
              { step: '02', title: 'Configure Integrations', desc: 'Connect REST APIs, configure authentication, headers, retries, transformations, and conditions.' },
              { step: '03', title: 'Deploy Instantly', desc: 'Publish workflows as production-ready REST APIs without writing custom business logic.' }
            ].map((step, i) => (
              <div key={i} className="glass-panel p-8 text-left space-y-4 relative">
                <span className="text-4xl font-extrabold text-slate-800 font-mono block">{step.step}</span>
                <h3 className="text-lg font-bold text-slate-200">{step.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 py-20 text-center space-y-12">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Production-Ready Architecture</h2>
          <p className="text-slate-400 text-sm">Modular Clean Architecture blocks optimized for low-latency orchestration.</p>
        </div>

        {/* Visual Pipeline Block Cards */}
        <div className="flex flex-wrap justify-center items-center gap-3 max-w-4xl mx-auto">
          {[
            'Client',
            'API Gateway',
            'Authentication',
            'Workflow Engine',
            'Validation',
            'Mapper',
            'HTTP Executor',
            'Parallel Workers',
            'Transformation Engine',
            'Standardized Response'
          ].map((block, i) => (
            <React.Fragment key={i}>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-300">
                {block}
              </div>
              {i < 9 && <span className="text-slate-700 text-xs">→</span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Developer Features Section */}
      <section id="developers" className="relative z-10 bg-slate-950/20 py-20 border-y border-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center space-y-16">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Built for Developers</h2>
            <p className="text-slate-400 text-sm">Git-ready, containerized, and fully scriptable infrastructure configurations.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Code2, title: 'Configuration Driven', desc: 'Every API is generated from configuration.' },
              { icon: GitBranch, title: 'Versioned Workflows', desc: 'Maintain multiple workflow versions safely.' },
              { icon: FileCode, title: 'Swagger Ready', desc: 'Automatically generated API documentation.' },
              { icon: Gauge, title: 'Metrics Endpoint', desc: 'Prometheus-compatible monitoring.' },
              { icon: ShieldCheck, title: 'Rate Limiting', desc: 'Protect APIs using configurable throttling.' },
              { icon: Container, title: 'Docker Support', desc: 'Deploy anywhere using Docker Compose.' },
              { icon: GitPullRequest, title: 'CI/CD Ready', desc: 'GitHub Actions pipeline included.' },
              { icon: Layers, title: 'Plugin Architecture', desc: 'Easily extend the workflow engine with custom execution nodes.' }
            ].map((dev, i) => {
              const Icon = dev.icon;
              return (
                <div key={i} className="glass-panel p-5 text-left flex items-start space-x-3.5">
                  <div className="w-8 h-8 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                    <Icon size={16} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">{dev.title}</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{dev.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6 text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100">AI-Powered Workflow Generation</h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Describe an API in natural language and let Gemini generate the orchestration configuration automatically.
          </p>

          {/* Example prompt block */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Example Prompt</span>
            <p className="text-slate-300 text-xs italic">
              "Create an API that validates a PAN, fetches customer information from an external service, transforms the response, and returns a standardized payload."
            </p>
          </div>

          <div className="space-y-2 text-xs font-medium text-slate-400">
            <p className="font-semibold text-slate-200">Gemini automatically generates:</p>
            <ul className="grid grid-cols-2 gap-2 pl-4 list-disc">
              <li>Workflow JSON</li>
              <li>Request Mapping</li>
              <li>Response Mapping</li>
              <li>Validation Rules</li>
              <li>Execution Pipeline</li>
            </ul>
          </div>

          <button
            onClick={() => navigate(token ? '/ai' : '/login')}
            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-3 px-6 rounded-xl shadow-glow-brand flex items-center space-x-2 transition"
          >
            <Sparkles size={14} />
            <span>Generate with AI</span>
          </button>
        </div>

        {/* Dynamic code visualization panel */}
        <div className="lg:col-span-6 glass-panel p-5 font-mono text-[10px] text-slate-400 space-y-3 max-h-[300px] overflow-hidden border-brand-500/10">
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-2">
            <span>workflow_dag_spec.json</span>
            <span className="text-brand-500">Auto Generated</span>
          </div>
          <pre className="text-left text-slate-300">
{`{
  "name": "PAN Verification Pipeline",
  "nodes": [
    { "id": "val_1", "type": "VALIDATOR", "config": { "schema": { "pan": "string" } } },
    { "id": "http_1", "type": "HTTP_REQUEST", "config": { "url": "https://api.external.com/pan" } },
    { "id": "trans_1", "type": "TRANSFORM", "config": { "mapping": { "fullName": "$.data.name" } } }
  ],
  "edges": [
    { "source": "val_1", "target": "http_1" },
    { "source": "http_1", "target": "trans_1" }
  ]
}`}
          </pre>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="relative z-10 w-full py-6 border-t border-slate-900/60 bg-[#04060c]/80 text-center text-xs text-slate-600">
        © 2026 OrchestrAI. All rights reserved.
      </footer>
    </div>

  );
}
