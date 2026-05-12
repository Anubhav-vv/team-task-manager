import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, Inbox, ArrowUpRight, TrendingUp } from 'lucide-react';
import api from '../api';
import { format, isPast, parseISO } from 'date-fns';

const PRIORITY_STYLE = {
  high:   { bg: '#fef2f2', color: '#dc2626', label: 'High' },
  medium: { bg: '#fffbeb', color: '#d97706', label: 'Med' },
  low:    { bg: '#f0fdf4', color: '#16a34a', label: 'Low' },
};

const STATUS_STYLE = {
  todo:        { bg: '#f5f5f4', color: '#57534e', label: 'To Do' },
  in_progress: { bg: '#eff6ff', color: '#2563eb', label: 'In Progress' },
  done:        { bg: '#f0fdf4', color: '#16a34a', label: 'Done' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/tasks/dashboard').then(r => setData(r.data)).catch(() => {});
  }, []);

  const s = data?.stats || {};

  const stats = [
    { label: 'To Do',       value: s.todo || 0,        icon: Inbox,         bg: '#f5f5f4', iconColor: '#78716c' },
    { label: 'In Progress', value: s.in_progress || 0, icon: TrendingUp,    bg: '#eff6ff', iconColor: '#2563eb' },
    { label: 'Completed',   value: s.done || 0,        icon: CheckCircle2,  bg: '#f0fdf4', iconColor: '#16a34a' },
    { label: 'Overdue',     value: s.overdue || 0,     icon: AlertTriangle, bg: '#fef2f2', iconColor: '#dc2626' },
  ];

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1c1917', letterSpacing: '-0.5px' }}>
          Good morning, {user.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: '#78716c', fontSize: '14px', marginTop: '4px' }}>
          Here's a snapshot of your work today.
        </p>
      </div>

      {/* Stat bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {stats.map(({ label, value, icon: Icon, bg, iconColor }) => (
          <div key={label} className="card" style={{ padding: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px'
            }}>
              <Icon size={17} color={iconColor} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1c1917', letterSpacing: '-1px', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: '12px', color: '#78716c', marginTop: '4px', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Active tasks table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e8e6e1',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1c1917' }}>Active Tasks</h2>
            <p style={{ fontSize: '12px', color: '#a8a29e', marginTop: '1px' }}>Tasks across all your projects</p>
          </div>
          <Link to="/projects" style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: 600, color: '#7c3aed', textDecoration: 'none'
          }}>
            View projects <ArrowUpRight size={13} />
          </Link>
        </div>

        {!data?.recent?.length ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#d6d3d1" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', color: '#a8a29e' }}>No active tasks yet.</p>
            <Link to="/projects" style={{ fontSize: '13px', color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>
              Start a project →
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f5f5f4' }}>
                {['Task', 'Project', 'Priority', 'Status', 'Due'].map(h => (
                  <th key={h} style={{
                    padding: '10px 20px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((task, i) => {
                const p = PRIORITY_STYLE[task.priority];
                const st = STATUS_STYLE[task.status];
                const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                return (
                  <tr key={task.id} style={{ borderBottom: i < data.recent.length - 1 ? '1px solid #f5f5f4' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 500, color: '#1c1917', maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '12px', color: '#78716c' }}>{task.project_name}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ background: p.bg, color: p.color, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px' }}>
                        {p.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ background: st.bg, color: st.color, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '12px', color: overdue ? '#dc2626' : '#78716c', fontWeight: overdue ? 600 : 400 }}>
                      {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
