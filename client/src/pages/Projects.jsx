import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Users, CheckSquare, ArrowUpRight, Trash2, Search } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const load = () => api.get('/projects').then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async e => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/projects', form);
      toast.success('Project created');
      setShowModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setCreating(false); }
  };

  const del = async (id, e) => {
    e.preventDefault();
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Deleted');
      setProjects(p => p.filter(x => x.id !== id));
    } catch { toast.error('Not authorized'); }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1c1917', letterSpacing: '-0.5px' }}>Projects</h1>
          <p style={{ fontSize: '13px', color: '#78716c', marginTop: '3px' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} you're working on
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
          <input className="input" placeholder="Search projects…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div style={{ width: '24px', height: '24px', border: '2.5px solid #e8e6e1', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <FolderOpen size={36} color="#d6d3d1" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#78716c', fontSize: '14px', marginBottom: '12px' }}>No projects found.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Create your first project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {filtered.map((p, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FolderOpen size={17} color={color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#a8a29e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <ArrowUpRight size={11} />
                      </span>
                      {p.owner_id === user.id && (
                        <button onClick={e => del(p.id, e)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                          color: '#d6d3d1', borderRadius: '4px', display: 'flex'
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                          onMouseLeave={e => e.currentTarget.style.color = '#d6d3d1'}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c1917', marginBottom: '4px' }}>{p.name}</h3>
                    <p style={{ fontSize: '12px', color: '#a8a29e', lineHeight: 1.5, minHeight: '32px' }}>
                      {p.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '12px', borderTop: '1px solid #f5f5f4' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#78716c' }}>
                      <Users size={12} /> {p.member_count} member{p.member_count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#78716c' }}>
                      <CheckSquare size={12} /> {p.task_count} tasks
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1c1917', marginBottom: '4px' }}>New Project</h2>
            <p style={{ fontSize: '13px', color: '#78716c', marginBottom: '20px' }}>Set up a new workspace for your team.</p>
            <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#57534e', marginBottom: '6px' }}>Project name *</label>
                <input className="input" required placeholder="e.g. Mobile App Redesign"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#57534e', marginBottom: '6px' }}>Description</label>
                <textarea className="input" rows={3} placeholder="What's this project about?"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }} disabled={creating}>
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
