import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, 
  Plus, 
  Trash2, 
  Copy, 
  Play, 
  Calendar, 
  Loader2,
  FolderOpen,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function WorkflowList() {
  const { workflows, fetchWorkflows, createWorkflow, duplicateWorkflow, deleteWorkflow, isLoading } = useWorkflowStore();
  const navigate = useNavigate();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const newWorkflow = await createWorkflow(name, description, tags);

    if (newWorkflow) {
      setName('');
      setDescription('');
      setTagsInput('');
      setCreateModalOpen(false);
      navigate(`/workflows/${newWorkflow._id}`);
    }
  };

  const handleDuplicate = async (id, e) => {
    e.stopPropagation(); // Avoid triggering card navigation click
    const copy = await duplicateWorkflow(id);
    if (copy) {
      fetchWorkflows();
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workflow? All versions will be archived.')) {
      await deleteWorkflow(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">API Workflows</h1>
          <p className="text-slate-400 mt-1">Design and configure orchestration pipelines using dynamic DAG nodes.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium py-2.5 px-4 rounded-xl shadow-glow-brand transition duration-200"
        >
          <Plus size={18} />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Main Grid */}
      {isLoading && workflows.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      ) : workflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((flow) => (
            <div
              key={flow._id}
              onClick={() => navigate(`/workflows/${flow._id}`)}
              className="glass-panel-interactive p-6 flex flex-col justify-between min-h-[220px] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-brand-500/10 border border-brand-500/20 rounded-lg text-brand-400">
                    <GitFork size={20} />
                  </div>
                  <span className={`
                    text-xs font-semibold px-2.5 py-0.5 rounded-full border
                    ${flow.status === 'published' 
                      ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' 
                      : 'bg-yellow-500/5 text-yellow-400 border-yellow-500/10'
                    }
                  `}>
                    {flow.status}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-1">
                  {flow.name}
                </h2>
                <p className="text-slate-400 text-sm mt-1.5 line-clamp-2">
                  {flow.description || 'No description provided.'}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Calendar size={13} />
                  <span>v{flow.currentVersion || 0} (Draft)</span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleDuplicate(flow._id, e)}
                    title="Duplicate Workflow"
                    className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700 hover:text-slate-200 transition"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(flow._id, e)}
                    title="Delete Workflow"
                    className="p-1.5 bg-slate-950 border border-red-500/10 text-red-500 rounded hover:bg-red-500/5 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center flex flex-col items-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 mb-4">
            <FolderOpen size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-200">No workflows configured</h2>
          <p className="text-slate-400 text-sm mt-1.5">
            Start by creating a visual workflow on our canvas. You can chain validators, HTTP calls, mapper templates, and AI agents dynamically.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-6 flex items-center space-x-2 bg-brand-500 hover:bg-brand-400 text-white font-medium py-2 px-4 rounded-xl text-sm transition"
          >
            <span>Create First Workflow</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-[#090d16] border border-slate-800/80 p-8 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2 mb-2">
              <Plus className="text-brand-400" size={22} />
              <span>Create New Workflow</span>
            </h2>
            <p className="text-slate-400 text-sm mb-6">Enter workflow metadata to initialize the visual canvas.</p>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. KYC Verification Pipeline"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize what this pipeline orchestrates..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. compliance, kyc, external"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm bg-brand-600 hover:bg-brand-500 text-slate-100 font-medium transition shadow-glow-brand"
                >
                  Create & Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
