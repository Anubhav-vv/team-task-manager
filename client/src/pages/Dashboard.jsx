import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, Circle, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../api';
import { format, isPast, parseISO } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-xl border border-slate-800 p-5" style={{ background: '#111827' }}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
      <Icon size={17} className="text-white" />
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
  </div>
);

const priorityDot = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-emerald-400' };
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const statusColor = { todo: 'text-slate-400 bg-slate-800', in_progress: 'text-blue-300 bg-blue-500/15', done: 'text-emerald-300 bg-emerald-500/15' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/tasks/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );

  const s = data?.stats || {};

  return (
    <div className="p-8 fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good morning, {user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Circle} label="To Do" value={s.todo || 0} color="bg-slate-600" />
        <StatCard icon={TrendingUp} label="In Progress" value={s.in_progress || 0} color="bg-blue-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={s.done || 0} color="bg-emerald-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={s.overdue || 0} color="bg-red-600" />
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden" style={{ background: '#111827' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Active Tasks</h2>
          <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            All projects <ArrowRight size={12} />
          </Link>
        </div>

        {!data?.recent?.length ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No active tasks. <Link to="/projects" className="text-indigo-400 hover:text-indigo-300">Create a project</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {data.recent.map(task => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{task.project_name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[task.status]}`}>
                  {statusLabel[task.status]}
                </span>
                {task.due_date && (
                  <span className={`text-xs ${isPast(parseISO(task.due_date)) ? 'text-red-400' : 'text-slate-500'}`}>
                    {format(parseISO(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
