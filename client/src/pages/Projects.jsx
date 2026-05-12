import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, CheckSquare, ArrowRight, Trash2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const load = () => api.get('/projects').then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const createProject = async e => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/projects', form);
      toast.success('Project created');
      setShowModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id, e) => {
    e.preventDefault();
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      setProjects(p => p.filter(x => x.id !== id));
    } catch {
      toast.error('Not authorized to delete');
    }
  };

  return (
    <div className="p-8 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-slate-700">
          <FolderKanban size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No projects yet.</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
            Create your first project →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link
              key={p.id} to={`/projects/${p.id}`}
              className="group relative rounded-xl border border-slate-800 p-5 hover:border-indigo-500/40 hover:bg-slate-800/20 transition-all"
              style={{ background: '#111827' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <FolderKanban size={16} className="text-indigo-400" />
                </div>
                {p.owner_id === user.id && (
                  <button
                    onClick={e => deleteProject(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1 rounded"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 truncate">{p.name}</h3>
              <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2rem]">
                {p.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users size={12} /> {p.member_count}</span>
                <span className="flex items-center gap-1"><CheckSquare size={12} /> {p.task_count} tasks</span>
                <span className="ml-auto flex items-center gap-1 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 p-6 fade-in" style={{ background: '#111827' }}>
            <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Project name</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description (optional)</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  placeholder="What's this project about?"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
                >Cancel</button>
                <button
                  type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {creating ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
