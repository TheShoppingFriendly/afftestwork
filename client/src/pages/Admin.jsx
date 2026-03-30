import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Progress, Spinner } from '../components/ui';
import api from '../utils/api';

const ROLE_COLORS = {
  admin: '#7c6ef7', manager: '#14b8a6', lead: '#f43f5e',
  member: '#f59e0b', client: '#6b6980',
};

export default function Admin() {
  const { projects, tasks, users, loading, showToast } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(null);

  if (!['admin','manager'].includes(user?.role)) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>🔒</div>
        <div style={{ color: '#6b6980', fontSize: 14 }}>Access restricted to admins and managers</div>
      </div>
    );
  }

  const doExport = async (endpoint, filename) => {
    setExporting(filename);
    try {
      const res = await api.get(`/export/${endpoint}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showToast(`${filename} downloaded`);
    } catch {
      showToast('Export failed', 'error');
    } finally { setExporting(null); }
  };

  const totalBudget = projects.reduce((s,p) => s + Number(p.budget), 0);
  const totalSpent  = projects.reduce((s,p) => s + Number(p.spent), 0);
  const activeUsers = users.filter(u => u.is_active && u.role !== 'client');
  const doneTasks   = tasks.filter(t => t.status === 'done').length;
  const blockedTasks= tasks.filter(t => t.status === 'blocked').length;
  const overdueTasks= tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().slice(0,10) && t.status !== 'done').length;

  const systemCards = [
    { label: 'Total Projects',   value: projects.length,      color: '#7c6ef7' },
    { label: 'Total Tasks',      value: tasks.length,          color: '#14b8a6' },
    { label: 'Active Staff',     value: activeUsers.length,    color: '#10b981' },
    { label: 'Overdue Tasks',    value: overdueTasks,          color: overdueTasks > 0 ? '#f43f5e' : '#6b6980' },
    { label: 'Blocked Tasks',    value: blockedTasks,          color: blockedTasks > 0 ? '#f59e0b' : '#6b6980' },
    { label: 'Completion Rate',  value: tasks.length > 0 ? `${Math.round(doneTasks/tasks.length*100)}%` : '—', color: '#38bdf8' },
    { label: 'Total Budget',     value: `$${(totalBudget/1000).toFixed(0)}k`, color: '#a855f7' },
    { label: 'Total Spent',      value: `$${(totalSpent/1000).toFixed(0)}k`,  color: totalSpent/totalBudget > 0.85 ? '#f43f5e' : '#10b981' },
  ];

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e8e6f0', marginBottom: 6 }}>Admin Panel</div>
      <div style={{ color: '#6b6980', fontSize: 13, marginBottom: 28 }}>System overview, exports, and management</div>

      {/* System Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {systemCards.map((c, i) => (
          <div key={i} style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, color: '#6b6980', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 500 }}>{c.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Budget Health */}
        <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0', marginBottom: 16 }}>Budget Health</div>
          {projects.slice(0,6).map(p => {
            const pct = p.budget > 0 ? Math.round(Number(p.spent)/Number(p.budget)*100) : 0;
            const color = pct > 90 ? '#f43f5e' : pct > 75 ? '#f59e0b' : '#10b981';
            return (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#9b99b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{p.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0 }}>{pct}%</span>
                </div>
                <Progress value={pct} color={color} height={4} />
              </div>
            );
          })}
        </div>

        {/* Team activity */}
        <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0', marginBottom: 16 }}>Team Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeUsers.map(u => {
              const ut = tasks.filter(t => t.assignees?.some(a => a.id === u.id));
              const open = ut.filter(t => t.status !== 'done').length;
              const done = ut.filter(t => t.status === 'done').length;
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar user={u} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#e8e6f0', fontWeight: 500 }}>{u.name}</span>
                      <span style={{ fontSize: 11, color: '#6b6980' }}>{open} open · {done} done</span>
                    </div>
                    <Progress value={Math.min(100, open * 10)} color={u.color} height={3} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exports */}
      <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0', marginBottom: 6 }}>Data Exports</div>
        <div style={{ fontSize: 13, color: '#6b6980', marginBottom: 16 }}>Download CSV reports for use in spreadsheets or external reporting tools.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Projects Report',   desc: 'All projects with budget, status, progress', endpoint: 'projects.csv', filename: 'projects.csv', icon: '◈' },
            { label: 'Tasks Report',      desc: 'All tasks with assignees and time data',      endpoint: 'tasks.csv',    filename: 'tasks.csv',    icon: '◉' },
            { label: 'Time Report',       desc: 'Time logs per team member and task',          endpoint: 'time-report.csv', filename: 'time-report.csv', icon: '◓' },
          ].map(exp => (
            <div key={exp.endpoint} style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 22, marginBottom: 10, color: '#7c6ef7' }}>{exp.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: '#e8e6f0', marginBottom: 4 }}>{exp.label}</div>
              <div style={{ fontSize: 12, color: '#6b6980', marginBottom: 14, lineHeight: 1.5 }}>{exp.desc}</div>
              <button
                onClick={() => doExport(exp.endpoint, exp.filename)}
                disabled={exporting === exp.filename}
                style={{ width: '100%', padding: '8px', background: exporting === exp.filename ? '#252538' : 'rgba(124,110,247,0.12)', border: '1px solid rgba(124,110,247,0.3)', borderRadius: 8, color: '#a394ff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                {exporting === exp.filename ? 'Downloading...' : '↓ Download CSV'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Manage Users',   desc: 'Invite, edit, deactivate', icon: '◎', path: '/settings' },
          { label: 'All Projects',   desc: 'View and create projects',  icon: '◈', path: '/projects' },
          { label: 'Analytics',      desc: 'Full analytics dashboard',  icon: '◓', path: '/analytics' },
          { label: 'Team Overview',  desc: 'Workload and assignments',  icon: '◐', path: '/team' },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)} style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.border='1px solid rgba(255,255,255,0.14)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.border='1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.transform='none'; }}>
            <div style={{ fontSize: 22, marginBottom: 8, color: '#7c6ef7' }}>{item.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#e8e6f0', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: '#6b6980' }}>{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
