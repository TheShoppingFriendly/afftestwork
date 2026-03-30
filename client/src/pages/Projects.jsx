import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Avatar, Badge, Progress, Pill,
  statusMeta, priorityMeta, typeIcons,
  Modal, FormField, EmptyState, Spinner,
} from '../components/ui';
import LogTimeModal from '../components/LogTimeModal';
import api from '../utils/api';

// ── PROJECT LIST ───────────────────────────────────────────────
export function Projects() {
  const { isManager } = useAuth();
  const { projects, loading } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => projects.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [projects, filter, search]);

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e8e6f0' }}>Projects</div>
          <div style={{ color: '#6b6980', fontSize: 13, marginTop: 2 }}>{filtered.length} projects</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." style={{ width: 200 }} />
          {isManager && (
            <button onClick={() => navigate('/projects/new')}
              style={{ padding: '8px 16px', background: '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
              ＋ New Project
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all','in_progress','review','todo','backlog','done'].map(s => (
          <Pill key={s} active={filter===s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : statusMeta[s]?.label}
          </Pill>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="◈" title="No projects found" subtitle="Try adjusting your filters" />
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
            {filtered.map(p => <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />)}
          </div>
        )}
    </div>
  );
}

// ── PROJECT CARD ───────────────────────────────────────────────
function ProjectCard({ project: p, onClick }) {
  const { tasks } = useApp();
  const sm = statusMeta[p.status];
  const pm = priorityMeta[p.priority];
  const projTasks = tasks.filter(t => t.project_id === p.id);
  const doneTasks = projTasks.filter(t => t.status === 'done').length;
  const team = p.team || [];
  const budgetPct = p.budget > 0 ? Math.round(Number(p.spent) / Number(p.budget) * 100) : 0;

  return (
    <div onClick={onClick}
      style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.border='1px solid rgba(255,255,255,0.15)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.border='1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.transform='none'; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.color, borderRadius: '16px 16px 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 22, color: p.color }}>{typeIcons[p.type] || '◆'}</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <Badge label={sm?.label} color={sm?.color} bg={sm?.bg} />
          <Badge label={pm?.label} color={pm?.color} />
        </div>
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0', marginBottom: 3 }}>{p.name}</div>
      <div style={{ fontSize: 12, color: '#6b6980', marginBottom: 4 }}>{p.type} · {p.client}</div>
      <div style={{ fontSize: 12, color: '#9b99b0', marginBottom: 14, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#6b6980' }}>Progress</span>
          <span style={{ fontSize: 11, color: '#9b99b0', fontWeight: 500 }}>{p.progress}%</span>
        </div>
        <Progress value={p.progress} color={p.color} height={5} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {team.slice(0, 4).map((u, i) => (
            <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid #1e1e2e', borderRadius: '50%' }}>
              <Avatar user={u} size={24} />
            </div>
          ))}
          {team.length > 4 && (
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16161f', border: '2px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6b6980', marginLeft: -8 }}>
              +{team.length - 4}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#6b6980' }}>{doneTasks}/{projTasks.length} tasks · {p.due_date}</span>
      </div>

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 11, color: '#6b6980' }}>Budget: <span style={{ color: '#9b99b0' }}>${(Number(p.spent)/1000).toFixed(0)}k / ${(Number(p.budget)/1000).toFixed(0)}k</span></span>
        <span style={{ fontSize: 11, color: budgetPct > 90 ? '#f43f5e' : '#6b6980' }}>{budgetPct}% used</span>
      </div>
    </div>
  );
}

// ── PROJECT DETAIL ─────────────────────────────────────────────
export function ProjectDetail() {
  const { id } = useParams();
  const { isLead } = useAuth();
  const { projects, tasks, updateTask, createTask, showToast, updateProject } = useApp();
  const navigate = useNavigate();

  const [boardView, setBoardView] = useState(true);
  const [newTaskModal, setNewTaskModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [activity, setActivity] = useState([]);

  const project = projects.find(p => p.id === id);
  const projTasks = tasks.filter(t => t.project_id === id);

  useEffect(() => {
    if (id) {
      api.get(`/projects/${id}/activity`).then(r => setActivity(r.data)).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (project) setProgressVal(project.progress);
  }, [project]);

  if (!project) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  );

  const sm = statusMeta[project.status];
  const pm = priorityMeta[project.priority];
  const statuses = ['backlog','todo','in_progress','review','done','blocked'];
  const doneTasks = projTasks.filter(t => t.status === 'done').length;

  const moveTask = async (taskId, newStatus) => {
    try { await updateTask(taskId, { status: newStatus }); }
    catch { showToast('Failed to update task', 'error'); }
  };

  const saveProgress = async () => {
    await updateProject(id, { progress: progressVal });
    setEditingProgress(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#111118', flexShrink: 0 }}>
        <button onClick={() => navigate('/projects')}
          style={{ fontSize: 12, color: '#6b6980', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back to Projects
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: project.color }} />
              <span style={{ fontSize: 12, color: '#6b6980' }}>{project.type} · {project.client}</span>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e8e6f0', marginBottom: 8 }}>{project.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge label={sm?.label} color={sm?.color} bg={sm?.bg} />
              <Badge label={pm?.label} color={pm?.color} />
              {(project.tags || []).map(tag => <Badge key={tag} label={`#${tag}`} color="#6b6980" bg="rgba(107,105,128,0.15)" />)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Editable progress */}
            <div style={{ textAlign: 'right', cursor: isLead ? 'pointer' : 'default' }} onClick={() => isLead && setEditingProgress(true)}>
              {editingProgress ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min="0" max="100" value={progressVal} onChange={e => setProgressVal(Number(e.target.value))} style={{ width: 80 }} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: project.color }}>{progressVal}%</span>
                  <button onClick={saveProgress} style={{ padding: '3px 8px', background: '#7c6ef7', border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingProgress(false)} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: '#6b6980', fontSize: 11, cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 10, color: '#6b6980', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progress {isLead && <span style={{ color: '#7c6ef7' }}>· edit</span>}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 24, color: project.color }}>{project.progress}%</div>
                </>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#6b6980', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Budget</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 24, color: '#e8e6f0' }}>${(Number(project.budget)/1000).toFixed(0)}k</div>
              <div style={{ fontSize: 10, color: Number(project.spent)/Number(project.budget) > 0.9 ? '#f43f5e' : '#6b6980' }}>
                ${(Number(project.spent)/1000).toFixed(0)}k spent
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              {(project.team || []).map((u, i) => (
                <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0 }}><Avatar user={u} size={32} /></div>
              ))}
            </div>

            {isLead && (
              <button onClick={() => setNewTaskModal(true)}
                style={{ padding: '8px 16px', background: '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                ＋ Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View toggle + stats */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, alignItems: 'center' }}>
        <Pill active={boardView} onClick={() => setBoardView(true)}>Board</Pill>
        <Pill active={!boardView} onClick={() => setBoardView(false)}>List</Pill>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, color: '#6b6980' }}>
          <span>{doneTasks}/{projTasks.length} done</span>
          <span style={{ color: projTasks.filter(t=>t.status==='blocked').length>0 ? '#f43f5e' : '#6b6980' }}>
            {projTasks.filter(t=>t.status==='blocked').length} blocked
          </span>
          <span>Due {project.due_date}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {boardView ? (
            <div style={{ padding: '20px 32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(220px,1fr))', gap: 14, minWidth: 'fit-content' }}>
                {statuses.map(status => {
                  const colTasks = projTasks.filter(t => t.status === status);
                  const col = statusMeta[status];
                  return (
                    <div key={status}
                      style={{ background: '#16161f', borderRadius: 12, padding: '12px', minHeight: 120 }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); if (dragTask) { moveTask(dragTask, status); setDragTask(null); } }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6b6980', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '1px 6px' }}>{colTasks.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {colTasks.map(task => (
                          <MiniTaskCard key={task.id} task={task}
                            onDragStart={() => setDragTask(task.id)}
                            onClick={() => setActiveTask(task)} />
                        ))}
                      </div>
                      {isLead && (
                        <button onClick={() => setNewTaskModal(true)}
                          style={{ width: '100%', marginTop: 8, padding: '6px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#6b6980', fontSize: 11, cursor: 'pointer' }}>
                          + Add task
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 32px' }}>
              <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['','Task','Status','Priority','Assignees','Due','Time Logged'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: '#6b6980', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projTasks.map((task, i) => {
                      const s = statusMeta[task.status];
                      const pm2 = priorityMeta[task.priority];
                      const pct = task.time_estimate > 0 ? Math.min(100, Math.round((task.time_logged||0) / task.time_estimate * 100)) : 0;
                      return (
                        <tr key={task.id} onClick={() => setActiveTask(task)}
                          style={{ borderBottom: i < projTasks.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#16161f'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '11px 10px 11px 16px', width: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${pm2?.color}`, background: task.status==='done' ? pm2?.color : 'transparent' }} />
                          </td>
                          <td style={{ padding: '11px 8px' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: task.status==='done' ? '#6b6980' : '#e8e6f0', textDecoration: task.status==='done' ? 'line-through' : 'none' }}>{task.title}</div>
                            {task.tags?.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                {task.tags.slice(0,3).map(t => <Badge key={t} label={t} color="#6b6980" bg="rgba(107,105,128,0.12)" />)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '11px 8px', whiteSpace: 'nowrap' }}><Badge label={s?.label} color={s?.color} bg={s?.bg} /></td>
                          <td style={{ padding: '11px 8px', whiteSpace: 'nowrap' }}><Badge label={pm2?.label} color={pm2?.color} /></td>
                          <td style={{ padding: '11px 8px' }}>
                            <div style={{ display: 'flex' }}>
                              {(task.assignees || []).map((u, i) => <div key={u.id} style={{ marginLeft: i>0?-6:0 }}><Avatar user={u} size={22} /></div>)}
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: '#9b99b0', whiteSpace: 'nowrap' }}>{task.due_date || '—'}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <div style={{ fontSize: 11, color: '#6b6980', marginBottom: 3 }}>
                              {Math.round((task.time_logged||0)/60)}h / {Math.round((task.time_estimate||0)/60)}h
                            </div>
                            <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#14b8a6' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {projTasks.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: '#6b6980' }}>No tasks yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity sidebar */}
        {activity.length > 0 && (
          <div style={{ width: 240, borderLeft: '1px solid rgba(255,255,255,0.07)', padding: '16px', overflowY: 'auto', flexShrink: 0, background: '#0d0d14' }}>
            <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Activity</div>
            {activity.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: i < activity.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <Avatar user={{ name: a.user_name, avatar: a.avatar, color: a.color }} size={22} />
                <div>
                  <div style={{ fontSize: 11, color: '#9b99b0', lineHeight: 1.5 }}>
                    <span style={{ color: a.color || '#7c6ef7', fontWeight: 500 }}>{a.user_name?.split(' ')[0]}</span>
                    {' '}{humanizeAction(a.action)}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b6980', marginTop: 2 }}>
                    {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {newTaskModal && <NewTaskModal projectId={id} onClose={() => setNewTaskModal(false)} onCreate={createTask} />}
      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onUpdate={async (tid, updates) => {
            await updateTask(tid, updates);
            setActiveTask(t => ({ ...t, ...updates }));
          }}
        />
      )}
    </div>
  );
}

function humanizeAction(action) {
  const map = {
    task_created: 'created a task',
    task_updated: 'updated a task',
    project_created: 'created this project',
    project_updated: 'updated project details',
    comment_added: 'left a comment',
  };
  return map[action] || action?.replace(/_/g, ' ');
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// ── MINI TASK CARD (Kanban) ────────────────────────────────────
function MiniTaskCard({ task, onDragStart, onClick }) {
  const pm = priorityMeta[task.priority];
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', borderLeft: `3px solid ${pm.color}`, transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.border=`1px solid rgba(255,255,255,0.14)`}
      onMouseLeave={e => e.currentTarget.style.border=`1px solid rgba(255,255,255,0.07)`}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e6f0', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
      {task.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          {task.tags.slice(0,2).map(t => <Badge key={t} label={t} color="#6b6980" bg="rgba(107,105,128,0.12)" />)}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {(task.assignees || []).map((u, i) => <div key={u.id} style={{ marginLeft: i>0?-5:0 }}><Avatar user={u} size={18} /></div>)}
        </div>
        <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#6b6980' }}>
          {task.comment_count > 0 && <span>💬{task.comment_count}</span>}
          {task.due_date && <span>📅 {task.due_date}</span>}
        </div>
      </div>
    </div>
  );
}

// ── TASK DETAIL MODAL (full featured) ─────────────────────────
export function TaskDetailModal({ task, onClose, onUpdate }) {
  const { projects } = useApp();
  const { isLead } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [activeTab, setActiveTab] = useState('comments');
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const [saving, setSaving] = useState(false);

  const project = projects.find(p => p.id === localTask.project_id);
  const sm = statusMeta[localTask.status];
  const pm = priorityMeta[localTask.priority];

  useEffect(() => {
    setLoadingComments(true);
    api.get(`/tasks/${task.id}/comments`)
      .then(r => setComments(r.data))
      .finally(() => setLoadingComments(false));
  }, [task.id]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/tasks/${task.id}/comments`, { content: newComment });
      setComments(c => [...c, res.data]);
      setNewComment('');
    } catch {}
  };

  const handleFieldChange = async (field, value) => {
    setLocalTask(t => ({ ...t, [field]: value }));
    setSaving(true);
    try { await onUpdate(task.id, { [field]: value }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 760, maxHeight: '88vh', background: '#1e1e2e', borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 64px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <Badge label={sm?.label} color={sm?.color} bg={sm?.bg} />
              <Badge label={pm?.label} color={pm?.color} />
              {project && <Badge label={project.name.split(' ')[0]} color={project.color} />}
              {saving && <span style={{ fontSize: 11, color: '#6b6980' }}>Saving…</span>}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 17, color: '#e8e6f0', lineHeight: 1.3 }}>{localTask.title}</div>
          </div>
          <button onClick={onClose} style={{ color: '#6b6980', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left — comments / activity */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {['comments','details'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab===tab ? '#7c6ef7' : 'transparent'}`, color: activeTab===tab ? '#7c6ef7' : '#6b6980', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', marginBottom: -1 }}>
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {activeTab === 'comments' && (
                <>
                  {localTask.description && (
                    <div style={{ fontSize: 13, color: '#9b99b0', lineHeight: 1.7, marginBottom: 20, padding: '12px', background: '#16161f', borderRadius: 10 }}>
                      {localTask.description}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Comments ({comments.length})
                  </div>
                  {loadingComments ? <Spinner /> : (
                    <>
                      {comments.length === 0 && (
                        <div style={{ fontSize: 13, color: '#6b6980', textAlign: 'center', padding: '20px 0' }}>No comments yet. Start the conversation.</div>
                      )}
                      {comments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                          <Avatar user={c} size={28} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#e8e6f0' }}>{c.name}</span>
                              <span style={{ fontSize: 11, color: '#6b6980' }}>{timeAgo(c.created_at)}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#9b99b0', background: '#16161f', borderRadius: 10, padding: '8px 12px', lineHeight: 1.6 }}>{c.content}</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input value={newComment} onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                          placeholder="Write a comment… (Enter to post)" style={{ flex: 1 }} />
                        <button onClick={postComment}
                          style={{ padding: '8px 14px', background: '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                          Post
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Title</div>
                    <input defaultValue={localTask.title} onBlur={e => { if (e.target.value !== localTask.title) handleFieldChange('title', e.target.value); }} style={{ width: '100%', fontSize: 13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</div>
                    <textarea defaultValue={localTask.description || ''} onBlur={e => { if (e.target.value !== localTask.description) handleFieldChange('description', e.target.value); }} style={{ width: '100%', height: 90, resize: 'vertical' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tags</div>
                    <input defaultValue={(localTask.tags || []).join(', ')} onBlur={e => handleFieldChange('tags', e.target.value.split(',').map(t=>t.trim()).filter(Boolean))} placeholder="api, design, bug…" style={{ width: '100%', fontSize: 13 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ width: 220, padding: '16px', overflowY: 'auto', flexShrink: 0 }}>
            {/* Assignees */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Assignees</div>
              {(localTask.assignees || []).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Avatar user={u} size={24} />
                  <div>
                    <div style={{ fontSize: 12, color: '#e8e6f0' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: '#6b6980' }}>{u.team}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</div>
              <select value={localTask.status} onChange={e => handleFieldChange('status', e.target.value)} style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}>
                {Object.entries(statusMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Priority</div>
              <select value={localTask.priority} onChange={e => handleFieldChange('priority', e.target.value)} style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}>
                {Object.entries(priorityMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Due date */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Due Date</div>
              <input type="date" value={localTask.due_date || ''} onChange={e => handleFieldChange('due_date', e.target.value)} style={{ width: '100%', fontSize: 12, padding: '6px 10px' }} />
            </div>

            {/* Time tracking */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time</div>
                <button onClick={() => setLogTimeOpen(true)}
                  style={{ fontSize: 10, color: '#7c6ef7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  + Log
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#9b99b0', marginBottom: 5 }}>
                {Math.round((localTask.time_logged||0)/60)}h logged · {Math.round((localTask.time_estimate||0)/60)}h est
              </div>
              <Progress
                value={localTask.time_estimate > 0 ? Math.min(100, Math.round((localTask.time_logged||0)/localTask.time_estimate*100)) : 0}
                color="#14b8a6" height={4}
              />
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#6b6980', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Attachments</div>
              <div style={{ fontSize: 12, color: '#9b99b0', marginBottom: 6 }}>{localTask.attachments || 0} files</div>
              {isLead && (
                <label style={{ display: 'block', padding: '6px', textAlign: 'center', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.12)', color: '#6b6980', fontSize: 11, cursor: 'pointer' }}>
                  + Upload File
                  <input type="file" multiple style={{ display: 'none' }} onChange={async (e) => {
                    const fd = new FormData();
                    Array.from(e.target.files).forEach(f => fd.append('files', f));
                    try {
                      await api.post(`/upload/task/${task.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setLocalTask(t => ({ ...t, attachments: (t.attachments||0) + e.target.files.length }));
                    } catch {}
                  }} />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {logTimeOpen && (
        <LogTimeModal
          taskId={task.id}
          taskTitle={localTask.title}
          currentLogged={localTask.time_logged || 0}
          onClose={() => setLogTimeOpen(false)}
          onLogged={(mins) => setLocalTask(t => ({ ...t, time_logged: (t.time_logged||0) + mins }))}
        />
      )}
    </div>
  );
}

// ── NEW TASK MODAL ─────────────────────────────────────────────
export function NewTaskModal({ projectId, onClose, onCreate }) {
  const { users, projects } = useApp();
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    projectId: projectId || '', dueDate: '', timeEstimate: '', tags: '', assigneeIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Task title is required'); return; }
    if (!form.projectId) { setError('Please select a project'); return; }
    setSaving(true); setError('');
    try {
      await onCreate({
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        timeEstimate: form.timeEstimate ? parseInt(form.timeEstimate) * 60 : 0,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task');
      setSaving(false);
    }
  };

  return (
    <Modal title="New Task" onClose={onClose} width={540}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
        {error && <div style={{ fontSize: 12, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
        <FormField label="Task Title" required>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" style={{ width: '100%' }} autoFocus />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add details…" style={{ width: '100%', height: 70, resize: 'vertical' }} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%' }}>
              {Object.entries(statusMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
              {Object.entries(priorityMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
          {!projectId && (
            <FormField label="Project" required>
              <select value={form.projectId} onChange={e => set('projectId', e.target.value)} style={{ width: '100%' }}>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Due Date">
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Est. Hours">
            <input type="number" value={form.timeEstimate} onChange={e => set('timeEstimate', e.target.value)} placeholder="0" style={{ width: '100%' }} min="0" />
          </FormField>
        </div>
        <FormField label="Assignees">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {users.filter(u => u.role !== 'client' && u.is_active).map(u => {
              const sel = form.assigneeIds.includes(u.id);
              return (
                <button key={u.id}
                  onClick={() => set('assigneeIds', sel ? form.assigneeIds.filter(id => id !== u.id) : [...form.assigneeIds, u.id])}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1px solid ${sel ? u.color : 'rgba(255,255,255,0.1)'}`, background: sel ? `${u.color}20` : 'transparent', color: sel ? u.color : '#9b99b0', fontSize: 11, cursor: 'pointer' }}>
                  <Avatar user={u} size={16} />
                  {u.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </FormField>
        <FormField label="Tags (comma separated)">
          <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="design, api, bug…" style={{ width: '100%' }} />
        </FormField>
      </div>
      <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#9b99b0', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '8px 20px', background: saving ? '#4a3fa0' : '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Creating…' : 'Create Task'}
        </button>
      </div>
    </Modal>
  );
}

// ── NEW PROJECT PAGE ───────────────────────────────────────────
export function NewProject() {
  const { createProject, users } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', type: 'Web Development', client: '', status: 'todo', priority: 'medium',
    startDate: '', dueDate: '', budget: '', description: '', color: '#7c6ef7', tags: '', leadId: '', teamIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const PROJECT_TYPES = ['Web Development','Mobile App','Brand Identity','SEO Campaign','Social Media','Content Strategy','UI/UX Design','Video Production','Email Marketing','Analytics'];
  const COLORS = ['#7c6ef7','#14b8a6','#f43f5e','#f59e0b','#10b981','#38bdf8','#a855f7','#f97316'];

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Project name is required'); return; }
    setSaving(true); setError('');
    try {
      const proj = await createProject({
        ...form,
        budget: parseFloat(form.budget) || 0,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      navigate(`/projects/${proj.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create project');
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px', maxWidth: 660 }}>
      <button onClick={() => navigate('/projects')} style={{ fontSize: 12, color: '#6b6980', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>← Back</button>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e8e6f0', marginBottom: 24 }}>New Project</div>

      {error && <div style={{ fontSize: 13, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Project Name" required>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Project name…" style={{ width: '100%' }} autoFocus />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Type">
            <select value={form.type} onChange={e => set('type', e.target.value)} style={{ width: '100%' }}>
              {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Client">
            <input value={form.client} onChange={e => set('client', e.target.value)} placeholder="Client name…" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
              {Object.entries(priorityMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
          <FormField label="Budget ($)">
            <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" style={{ width: '100%' }} min="0" />
          </FormField>
          <FormField label="Start Date">
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Due Date">
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} style={{ width: '100%' }} />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ width: '100%', height: 80, resize: 'vertical' }} placeholder="Project overview…" />
        </FormField>
        <FormField label="Project Color">
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => set('color', c)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color===c ? '3px solid #e8e6f0' : '3px solid transparent', cursor: 'pointer', transition: 'border 0.15s' }} />
            ))}
          </div>
        </FormField>
        <FormField label="Team Members">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {users.filter(u => u.role !== 'client' && u.is_active).map(u => {
              const sel = form.teamIds.includes(u.id);
              return (
                <button key={u.id}
                  onClick={() => set('teamIds', sel ? form.teamIds.filter(id => id !== u.id) : [...form.teamIds, u.id])}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1px solid ${sel ? u.color : 'rgba(255,255,255,0.1)'}`, background: sel ? `${u.color}20` : 'transparent', color: sel ? u.color : '#9b99b0', fontSize: 11, cursor: 'pointer' }}>
                  <Avatar user={u} size={16} />
                  {u.name.split(' ')[0]}
                  <span style={{ fontSize: 10, color: sel ? u.color : '#6b6980', opacity: 0.7 }}>({u.role})</span>
                </button>
              );
            })}
          </div>
        </FormField>
        <FormField label="Tags (comma separated)">
          <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="react, branding, seo…" style={{ width: '100%' }} />
        </FormField>

        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button onClick={() => navigate('/projects')}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#9b99b0', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 28px', background: saving ? '#4a3fa0' : '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
