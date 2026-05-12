import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, LogOut, Layers } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f3' }}>
      {/* Top navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8e6e1',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', height: '56px', gap: '32px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Layers size={14} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', color: '#1c1917', letterSpacing: '-0.3px' }}>
            Taskly
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: '4px' }}>
          {[
            { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/projects', label: 'Projects', icon: FolderOpen }
          ].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '7px',
              fontSize: '13px', fontWeight: 500, textDecoration: 'none',
              transition: 'all 0.15s',
              background: isActive ? '#ede9fe' : 'transparent',
              color: isActive ? '#7c3aed' : '#78716c',
            })}>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: user */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: 'white'
            }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1c1917', lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: '#a8a29e', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
          <button onClick={logout} style={{
            background: 'none', border: '1px solid #e8e6e1', borderRadius: '7px',
            padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '12px', color: '#78716c', transition: 'all 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
