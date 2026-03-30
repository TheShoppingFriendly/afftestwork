import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar } from './ui';

const navItems = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard'  },
  { to: '/projects',  icon: '◈', label: 'Projects'   },
  { to: '/tasks',     icon: '◉', label: 'All Tasks'  },
  { to: '/team',      icon: '◎', label: 'Team'       },
  { to: '/analytics', icon: '◓', label: 'Analytics', roles: ['admin','manager'] },
  { to: '/timeline',  icon: '◐', label: 'Timeline'   },
  { to: '/admin',     icon: '◆', label: 'Admin',      roles: ['admin','manager'] },
  { to: '/settings',  icon: '◑', label: 'Settings'   },
];

export default function Sidebar() {
  const { user, logout, isManager } = useAuth();
  const { notifications, markRead, markAllRead, unreadCount } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ width: 220, background: '#111118', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 10 }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, letterSpacing: '-1px', color: '#e8e6f0' }}>
          <span style={{ color: '#7c6ef7' }}>flo</span>
        </div>
        <div style={{ fontSize: 10, color: '#6b6980', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Agency OS</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {navItems.filter(item => !item.roles || item.roles.includes(user?.role)).map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
            borderRadius: 10, textDecoration: 'none', marginBottom: 2,
            background: isActive ? 'rgba(124,110,247,0.15)' : 'transparent',
            color: isActive ? '#a394ff' : '#9b99b0',
            fontSize: 13, fontWeight: isActive ? 500 : 400, transition: 'all 0.15s',
          })}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setNotifOpen(o => !o)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 10, border: 'none', background: 'transparent',
            color: '#9b99b0', cursor: 'pointer', fontSize: 13,
          }}>
            <span style={{ fontSize: 16, position: 'relative' }}>
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: '#f43f5e', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            Notifications
          </button>

          {notifOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.6)', zIndex: 999 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: '#e8e6f0' }}>Notifications</span>
                <button onClick={markAllRead} style={{ fontSize: 11, color: '#7c6ef7', cursor: 'pointer', background: 'none', border: 'none' }}>Mark all read</button>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#6b6980' }}>No notifications</div>
                ) : notifications.slice(0, 15).map(n => (
                  <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.is_read ? 'transparent' : 'rgba(124,110,247,0.06)', cursor: 'pointer', display: 'flex', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.is_read ? 'transparent' : '#7c6ef7', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#e8e6f0', lineHeight: 1.4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 11, color: '#6b6980', marginTop: 1 }}>{n.body}</div>}
                      <div style={{ fontSize: 10, color: '#6b6980', marginTop: 2 }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* New Project btn for managers+ */}
        {isManager && (
          <NavLink to="/projects/new" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.12)', background: 'transparent', color: '#6b6980', cursor: 'pointer', fontSize: 12, textDecoration: 'none', marginTop: 4 }}>
            <span>＋</span> New Project
          </NavLink>
        )}

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', marginTop: 4, borderRadius: 10, background: '#16161f' }}>
          <Avatar user={user} size={30} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e6f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: '#6b6980', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" style={{ color: '#6b6980', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>⏻</button>
        </div>
      </div>
    </div>
  );
}
