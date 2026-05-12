import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, UserPlus, X, Users, ChevronLeft } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';

const COLS = [
  { key: 'todo',        label: 'To Do',       dot: '#a8a29e', header: '#f5f5f4' },
  { key: 'in_progress', label: 'In Progress',  dot: '#2563eb', header: '#eff6ff' },
  { key: 'done',        label: 'Done',         dot: '#16a34a', header: '#f0fdf4' },
];

const PRI = {
  high:   { bg: '#fef2f2', color: '#dc2626' },
  medium: { bg: '#fffbeb', color: '#d97706' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

const EMPTY_TASK = { title: '', description: '', status: 'todo', priority: 'medium', assigneeId: '', dueDate: '' };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal]     = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [form, setForm]   = useState(EMPTY_TASK);
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
      await api.post('/tasks', {
        ...form, projectId: Number(id),
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined
      });
      toast.success('Task added');
      setTaskModal(false);
      setForm(EMPTY_TASK);
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const changeStatus = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      setTasks(t => t.map(x => x.id === taskId ? { ...x, status } : x));
    } catch { toast.error('Update failed'); }
  };

  const deleteTask = async taskId => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(t => t.filter(x => x.id !== taskId));
    } catch { toast.error('Not authorized'); }
  };

  const addMember = async uid => {
    try {
      await api.post(`/projects/${id}/members`, { userId: Number(uid) });
      toast.success('Member added');
      loadProject();
    } catch { toast.error('Failed'); }
  };

  const removeMember = async uid => {
    try {
      await api.delete(`/projects/${id}/members/${uid}`);
      loadProject();
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div style={{ width: '24px', height: '24px', border: '2.5px solid #e8e6e1', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  const memberIds = project?.members?.map(m => m.id) || [];
  const nonMembers = users.filter(u => !memberIds.includes(u.id));
  const isAdmin = project?.owner_id === user.id ||
    project?.members?.find(m => m.id === user.id)?.project_role === 'admin';

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#78716c', textDecoration: 'none', marginBottom: '12px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
          onMouseLeave={e => e.currentTarget.style.color = '#78716c'}>
          <ChevronLeft size={13} /> Back to Projects
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1c1917', letterSpacing: '-0.5px' }}>{project?.name}</h1>
            {project?.description && (
              <p style={{ fontSize: '13px', color: '#78716c', marginTop: '4px' }}>{project.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn-ghost" onClick={() => setMemberModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} /> Team ({project?.members?.length || 0})
            </button>
            <button className="btn-primary" onClick={() => setTaskModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '10px 10px 0 0',
                background: col.header, borderBottom: '1px solid #e8e6e1',
                border: '1px solid #e8e6e1', borderBottom: 'none'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: col.dot, display: 'inline-block' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {col.label}
                </span>
                <span style={{
                  marginLeft: 'auto', background: 'white', border: '1px solid #e8e6e1',
                  borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: 600, color: '#78716c'
                }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{
                border: '1px solid #e8e6e1', borderTop: 'none', borderRadius: '0 0 10px 10px',
                padding: '10px', background: '#fafaf9', minHeight: '200px',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                {colTasks.map(task => {
                  const pri = PRI[task.priority];
                  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                  return (
                    <div key={task.id} className="card" style={{ padding: '12px' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1c1917', lineHeight: 1.4 }}>{task.title}</p>
                        <button onClick={() => deleteTask(task.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0,
                          color: '#d6d3d1', borderRadius: '4px', display: 'flex'
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                          onMouseLeave={e => e.currentTarget.style.color = '#d6d3d1'}>
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {task.description && (
                        <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '8px', lineHeight: 1.5 }}>{task.description}</p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ background: pri.bg, color: pri.color, fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {task.priority}
                        </span>
                        {task.assignee_name && (
                          <span style={{ background: '#f5f5f4', color: '#57534e', fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: '20px' }}>
                            {task.assignee_name.split(' ')[0]}
                          </span>
                        )}
                        {task.due_date && (
                          <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 500, color: overdue ? '#dc2626' : '#a8a29e' }}>
                            {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>

                      <select value={task.status} onChange={e => changeStatus(task.id, e.target.value)}
                        style={{
                          width: '100%', padding: '5px 8px', border: '1px solid #e8e6e1', borderRadius: '6px',
                          fontSize: '11px', color: '#57534e', background: 'white', cursor: 'pointer',
                          fontFamily: 'inherit', outline: 'none'
                        }}>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#d6d3d1', padding: '20px 0' }}>No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task modal */}
      {taskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '460px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1c1917' }}>New Task</h2>
              <button onClick={() => setTaskModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="input" required placeholder="Task title *"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <textarea className="input" rows={2} placeholder="Description (optional)"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ resize: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#78716c', marginBottom: '5px' }}>Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#78716c', marginBottom: '5px' }}>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#78716c', marginBottom: '5px' }}>Assignee</label>
                  <select className="input" value={form.assigneeId} onChange={e => setForm(p => ({ ...p, assigneeId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {project?.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#78716c', marginBottom: '5px' }}>Due date</label>
                  <input className="input" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }} disabled={saving}>
                  {saving ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member modal */}
      {memberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '380px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1c1917' }}>Team</h2>
              <button onClick={() => setMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
              {project?.members?.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: 'white'
                  }}>{m.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1c1917' }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: '#a8a29e', textTransform: 'capitalize' }}>{m.project_role}</div>
                  </div>
                  {isAdmin && m.id !== user.id && (
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d6d3d1' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d6d3d1'}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && nonMembers.length > 0 && (
              <div style={{ borderTop: '1px solid #f5f5f4', paddingTop: '14px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Add members</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {nonMembers.map(u => (
                    <button key={u.id} onClick={() => addMember(u.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px',
                      background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', textAlign: 'left'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <UserPlus size={13} color="#7c3aed" />
                      <span style={{ fontSize: '13px', color: '#1c1917', fontWeight: 500 }}>{u.name}</span>
                      <span style={{ fontSize: '11px', color: '#a8a29e', marginLeft: 'auto' }}>{u.email}</span>
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
