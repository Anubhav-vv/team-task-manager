import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2, UserPlus, X, ChevronDown } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'text-slate-400', dot: 'bg-slate-500' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-400', dot: 'bg-blue-500' },
  { key: 'done', label: 'Done', color: 'text-emerald-400', dot: 'bg-emerald-500' }
];
const PRIORITY_COLOR = { high: 'text-red-400 bg-red-500/10', medium: 'text-amber-400 bg-amber-500/10', low: 'text-emerald-400 bg-emerald-500/10' };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assigneeId: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadProject = useCallback(() =>
    api.get(`/projects/${id}`).then(r => setProject(r.data)).catch(() => navigate('/projects')), [id, navigate]);

  const loadTasks = useCallback(() =>
    api.get(`/tasks?projectId=${id}`).then(r => setTasks(r.data)).catch(() => {}), [id]);

  useEffect(() => {
    Promise.all([loadProject(), loadTasks(), api.get('/users').then(r => setUsers(r.data))])
      .finally(() => setLoading(false));
  }, [loadProject, loadTasks]);

  const createTask = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tasks', { ...taskForm, projectId: Number(id), assigneeId: taskForm.assigneeId || undefined, dueDate: taskForm.dueDate || undefined });
      toast.success('Task created');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assigneeId: '', dueDate: '' });
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      setTasks(t => t.map(x => x.id === taskId ? { ...x, status } : x));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const deleteTask = async taskId => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(t => t.filter(x => x.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Not authorized');
    }
  };

  const addMember = async userId => {
    try {
      await api.post(`/projects/${id}/members`, { userId: Number(userId) });
      toast.success('Member added');
      loadProject();
    } catch {
      toast.error('Failed to add member');
    }
  };

  const removeMember = async userId => {
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      toast.success('Member removed');
      loadProject();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );

  const memberIds = project?.members?.map(m => m.id) || [];
  const nonMembers = users.filter(u => !memberIds.includes(u.id));
  const isAdmin = project?.owner_id === user.id || project?.members?.find(m => m.id === user.id)?.project_role === 'admin';

  return (
    <div className="p-8 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{project?.name}</h1>
          {project?.description && <p className="text-slate-400 text-sm mt-1">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMemberModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
          >
            <Users size={14} /> Team ({project?.members?.length || 0})
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Add task
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STATUS_COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="rounded-xl border border-slate-800 overflow-hidden" style={{ background: '#0d1421' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                <span className="ml-auto text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                  {colTasks.length}
                </span>
              </div>
              <div className="p-3 space-y-2 min-h-[120px]">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="group rounded-lg border border-slate-800 p-3 hover:border-slate-700 transition-all"
                    style={{ background: '#111827' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm text-slate-200 font-medium leading-snug">{task.title}</p>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {task.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLOR[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.assignee_name && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {task.assignee_name.split(' ')[0]}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`text-xs ml-auto ${isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'text-red-400' : 'text-slate-600'}`}>
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <select
                        value={task.status}
                        onChange={e => updateTaskStatus(task.id, e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-slate-700 text-slate-400 rounded px-2 py-1 focus:outline-none"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <p className="text-center text-xs text-slate-700 py-4">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 p-6 fade-in" style={{ background: '#111827' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">New Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createTask} className="space-y-3">
              <input
                type="text" required placeholder="Task title"
                value={taskForm.title}
                onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <textarea
                rows={2} placeholder="Description (optional)"
                value={taskForm.description}
                onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Assignee</label>
                  <select value={taskForm.assigneeId} onChange={e => setTaskForm(p => ({ ...p, assigneeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none">
                    <option value="">Unassigned</option>
                    {project?.members?.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Due date</label>
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {saving ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 p-6 fade-in" style={{ background: '#111827' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Team Members</h2>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {project?.members?.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{m.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{m.project_role}</p>
                  </div>
                  {isAdmin && m.id !== user.id && (
                    <button onClick={() => removeMember(m.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && nonMembers.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Add member</p>
                <div className="space-y-1">
                  {nonMembers.map(u => (
                    <button key={u.id} onClick={() => addMember(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-left transition-colors">
                      <UserPlus size={13} className="text-indigo-400" />
                      <span className="text-sm text-slate-300">{u.name}</span>
                      <span className="text-xs text-slate-600 ml-auto">{u.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
