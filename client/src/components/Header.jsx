import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import { Avatar } from './ui';

const BREADCRUMBS = {
  '/dashboard': 'Dashboard',
  '/projects':  'Projects',
  '/tasks':     'All Tasks',
  '/team':      'Team',
  '/analytics': 'Analytics',
  '/timeline':  'Timeline',
  '/settings':  'Settings',
};

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();

  const crumb = (() => {
    for (const [path, label] of Object.entries(BREADCRUMBS)) {
      if (location.pathname.startsWith(path)) return label;
    }
    return 'Flo';
  })();

  return (
    <div style={{
      height: 52, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 24px',
      background: '#111118',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Breadcrumb */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: '#e8e6f0' }}>
        {crumb}
      </div>

      <div style={{ flex: 1 }} />

      {/* Global search */}
      <GlobalSearch />

      {/* User avatar pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar user={user} size={28} />
        <span style={{ fontSize: 13, color: '#9b99b0', fontWeight: 500 }}>{user?.name?.split(' ')[0]}</span>
      </div>
    </div>
  );
}
