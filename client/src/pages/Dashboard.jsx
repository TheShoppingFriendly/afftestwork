import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar, Badge, Progress, statusMeta, priorityMeta, Spinner } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, tasks, users, loading } = useApp();
  const navigate = useNavigate();

  const myTasks = useMemo(() => tasks.filter(t => t.assignees?.some(a => a.id === user?.id) && t.status !== 'done'), [tasks, user]);
  const overdueCount = useMemo(() => tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().slice(0,10) && t.status !== 'done').length, [tasks]);
  const totalBudget = useMemo(() => projects.reduce((s, p) => s + Number(p.budget), 0), [projects]);
  const totalSpent  = useMemo(() => projects.reduce((s, p) => s + Number(p.spent), 0), [projects]);
  const activeProjects = useMemo(() => projects.filter(p => p.status === 'in_progress'), [projects]);

  const statCards = [
    { label: 'Active Projects', value: activeProjects.length, sub: `${projects.length} total`, color: '#7c6ef7' },
    { label: 'My Open Tasks',   value: myTasks.length,        sub: `${overdueCount} overdue`, color: '#14b8a6' },
    { label: 'Budget Used',     value: totalBudget > 0 ? `${Math.round(totalSpent/totalBudget*100)}%` : '—', sub: `$${(totalSpent/1000).toFixed(0)}k of $${(totalBudget/1000).toFixed(0)}k`, color: '#f59e0b' },
    { label: 'Team Members',    value: users.filter(u => u.role !== 'client').length, sub: 'active staff', color: '#a855f7' },
  ];

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 24, color: '#e8e6f0', marginBottom: 4 }}>
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </div>
        <div style={{ color: '#6b6980', fontSize: 14 }}>Here's your agency overview</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {statCards.map((card, i) => (
          <div key={i} style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: '#6b6980', marginTop: 6 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Active projects */}
        <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0' }}>Active Projects</div>
            <button onClick={() => navigate('/projects')} style={{ fontSize: 11, color: '#7c6ef7', cursor: 'pointer', background: 'none', border: 'none' }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeProjects.slice(0, 5).map(p => (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#16161f', borderRadius: 10, cursor: 'pointer', border: '1px solid transparent', transition: 'border 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e6f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ marginTop: 4 }}><Progress value={p.progress} color={p.color} /></div>
                </div>
                <div style={{ fontSize: 12, color: '#9b99b0', fontWeight: 500, flexShrink: 0 }}>{p.progress}%</div>
              </div>
            ))}
            {activeProjects.length === 0 && <div style={{ fontSize: 13, color: '#6b6980', textAlign: 'center', padding: '20px 0' }}>No active projects</div>}
          </div>
        </div>

        {/* My tasks */}
        <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0' }}>My Open Tasks</div>
            <button onClick={() => navigate('/tasks')} style={{ fontSize: 11, color: '#7c6ef7', cursor: 'pointer', background: 'none', border: 'none' }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myTasks.slice(0, 5).map(t => {
              const sm = statusMeta[t.status];
              const pm = priorityMeta[t.priority];
              const proj = projects.find(p => p.id === t.project_id);
              return (
                <div key={t.id} onClick={() => navigate('/tasks')} style={{ padding: '10px 12px', background: '#16161f', borderRadius: 10, cursor: 'pointer', borderLeft: `3px solid ${pm.color}`, transition: 'background 0.15s' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e6f0', marginBottom: 5, lineHeight: 1.4 }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                    {proj && <Badge label={proj.name.split(' ')[0]} color={proj.color} />}
                    {t.due_date && <span style={{ fontSize: 10, color: '#6b6980' }}>📅 {t.due_date}</span>}
                  </div>
                </div>
              );
            })}
            {myTasks.length === 0 && <div style={{ fontSize: 13, color: '#6b6980', textAlign: 'center', padding: '20px 0' }}>🎉 All caught up!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
