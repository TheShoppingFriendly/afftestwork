import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar, Badge, Progress, Pill, statusMeta, priorityMeta, EmptyState, Spinner } from '../components/ui';
import { NewTaskModal, TaskDetailModal } from './Projects';
import api from '../utils/api';

// ══ ALL TASKS ══════════════════════════════════════════════════
export function Tasks() {
  const { isLead } = useAuth();
  const { tasks, projects, createTask, updateTask, loading } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('status');
  const [newTaskModal, setNewTaskModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  const filtered = useMemo(() => tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tasks, filter, search]);

  const grouped = useMemo(() => {
    if (groupBy === 'status') {
      return Object.entries(statusMeta).map(([k,v]) => ({ key:k, label:v.label, color:v.color, items: filtered.filter(t=>t.status===k) })).filter(g=>g.items.length>0);
    }
    if (groupBy === 'priority') {
      return Object.entries(priorityMeta).map(([k,v]) => ({ key:k, label:v.label, color:v.color, items: filtered.filter(t=>t.priority===k) })).filter(g=>g.items.length>0);
    }
    return [{ key:'all', label:'All Tasks', color:'#9b99b0', items: filtered }];
  }, [filtered, groupBy]);

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:22, color:'#e8e6f0' }}>All Tasks</div>
          <div style={{ color:'#6b6980', fontSize:13, marginTop:2 }}>{filtered.length} tasks</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." style={{ width:200 }} />
          <select value={groupBy} onChange={e=>setGroupBy(e.target.value)} style={{ padding:'8px 12px', fontSize:13 }}>
            <option value="status">Group: Status</option>
            <option value="priority">Group: Priority</option>
            <option value="none">No grouping</option>
          </select>
          {isLead && <button onClick={()=>setNewTaskModal(true)} style={{ padding:'8px 16px', background:'#7c6ef7', border:'none', borderRadius:8, color:'#fff', fontWeight:500, fontSize:13, cursor:'pointer' }}>＋ New Task</button>}
        </div>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['all','todo','in_progress','review','done','blocked'].map(s=>(
          <Pill key={s} active={filter===s} onClick={()=>setFilter(s)}>
            {s==='all'?`All (${tasks.length})`:`${statusMeta[s]?.label} (${tasks.filter(t=>t.status===s).length})`}
          </Pill>
        ))}
      </div>

      {grouped.length === 0 ? <EmptyState icon="◉" title="No tasks found" subtitle="Try adjusting filters or create a new task" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {grouped.map(group => (
            <div key={group.key}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:group.color }} />
                <div style={{ fontFamily:'Syne, sans-serif', fontWeight:600, fontSize:14, color:group.color }}>{group.label}</div>
                <div style={{ fontSize:11, color:'#6b6980', background:'rgba(255,255,255,0.05)', borderRadius:4, padding:'1px 8px' }}>{group.items.length}</div>
              </div>
              <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {group.items.map((task,i)=>{
                      const p = projects.find(pr=>pr.id===task.project_id);
                      const sm = statusMeta[task.status];
                      const pm = priorityMeta[task.priority];
                      return (
                        <tr key={task.id} onClick={()=>setActiveTask(task)} style={{ borderBottom:i<group.items.length-1?'1px solid rgba(255,255,255,0.05)':'none', cursor:'pointer' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#16161f'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'11px 16px', width:18 }}>
                            <div style={{ width:12, height:12, borderRadius:'50%', border:`2px solid ${pm.color}`, background:task.status==='done'?pm.color:'transparent' }} />
                          </td>
                          <td style={{ padding:'11px 8px' }}>
                            <div style={{ fontSize:13, fontWeight:500, color:task.status==='done'?'#6b6980':'#e8e6f0', textDecoration:task.status==='done'?'line-through':'none' }}>{task.title}</div>
                            {p && <div style={{ fontSize:11, color:'#6b6980', marginTop:2 }}>{p.name}</div>}
                          </td>
                          <td style={{ padding:'11px 8px', whiteSpace:'nowrap' }}><Badge label={sm?.label} color={sm?.color} bg={sm?.bg} /></td>
                          <td style={{ padding:'11px 8px' }}>
                            <div style={{ display:'flex' }}>
                              {(task.assignees||[]).map((u,i)=><div key={u.id} style={{ marginLeft:i>0?-6:0 }}><Avatar user={u} size={22} /></div>)}
                            </div>
                          </td>
                          <td style={{ padding:'11px 16px', fontSize:12, color:'#6b6980', whiteSpace:'nowrap' }}>{task.due_date||'—'}</td>
                          <td style={{ padding:'11px 16px', fontSize:11, color:'#6b6980', whiteSpace:'nowrap' }}>
                            {task.comment_count>0&&<span style={{ marginRight:8 }}>💬{task.comment_count}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {newTaskModal && <NewTaskModal onClose={()=>setNewTaskModal(false)} onCreate={createTask} />}
      {activeTask && <TaskDetailModal task={activeTask} onClose={()=>setActiveTask(null)} onUpdate={updateTask} />}
    </div>
  );
}

// ══ TEAM ═══════════════════════════════════════════════════════
export function Team() {
  const { users, tasks, projects, teams, loading } = useApp();
  const { isManager } = useAuth();

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
      <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:22, color:'#e8e6f0', marginBottom:4 }}>Team</div>
      <div style={{ color:'#6b6980', fontSize:13, marginBottom:24 }}>{users.filter(u=>u.role!=='client').length} members · {teams.length} teams</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {users.filter(u=>u.role!=='client').map(u=>{
          const userTasks = tasks.filter(t=>t.assignees?.some(a=>a.id===u.id));
          const open = userTasks.filter(t=>t.status!=='done').length;
          const done = userTasks.filter(t=>t.status==='done').length;
          const userProjs = projects.filter(p=>p.team?.some(m=>m.id===u.id));
          return (
            <div key={u.id} style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:u.color }} />
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <Avatar user={u} size={44} />
                <div>
                  <div style={{ fontFamily:'Syne, sans-serif', fontWeight:600, fontSize:15, color:'#e8e6f0' }}>{u.name}</div>
                  <div style={{ fontSize:12, color:'#6b6980' }}>{u.team}</div>
                  <Badge label={u.role} color={u.color} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                {[{ label:'Open', value:open },{ label:'Done', value:done },{ label:'Projects', value:userProjs.length }].map(s=>(
                  <div key={s.label} style={{ background:'#16161f', borderRadius:8, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:18, color:u.color }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'#6b6980', marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:'#6b6980', marginBottom:6 }}>Workload</div>
              <Progress value={Math.min(100, open * 12)} color={u.color} height={4} />
              <div style={{ fontSize:11, color:'#6b6980', marginTop:10, display:'flex', gap:4, flexWrap:'wrap' }}>
                {userProjs.slice(0,3).map(p=><Badge key={p.id} label={p.name.split(' ')[0]} color={p.color} />)}
              </div>
              {isManager && <div style={{ fontSize:11, color:'#6b6980', marginTop:8 }}>{u.email}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══ ANALYTICS ══════════════════════════════════════════════════
export function Analytics() {
  const { projects, tasks, users, loading, showToast } = useApp();
  const [exporting, setExporting] = useState(null);

  const doExport = async (endpoint, filename) => {
    setExporting(filename);
    try {
      const res = await api.get(`/export/${endpoint}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showToast(`${filename} downloaded`);
    } catch { showToast('Export failed', 'error'); }
    finally { setExporting(null); }
  };

  const totalBudget = projects.reduce((s,p)=>s+Number(p.budget),0);
  const totalSpent  = projects.reduce((s,p)=>s+Number(p.spent),0);
  const doneTasks   = tasks.filter(t=>t.status==='done').length;
  const avgProgress = projects.length ? Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length) : 0;
  const activeStaff = users.filter(u=>u.role!=='client');

  const teamLoad = activeStaff.map(u=>({
    user:u, count: tasks.filter(t=>t.assignees?.some(a=>a.id===u.id)&&t.status!=='done').length
  })).sort((a,b)=>b.count-a.count);
  const maxLoad = Math.max(...teamLoad.map(t=>t.count), 1);

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
      <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:22, color:'#e8e6f0', marginBottom:24 }}>Analytics</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Budget',      value:`$${(totalBudget/1000).toFixed(0)}k`, sub:`$${(totalSpent/1000).toFixed(0)}k spent`, color:'#7c6ef7' },
          { label:'Budget Remaining',  value:totalBudget>0?`${Math.round((1-totalSpent/totalBudget)*100)}%`:'—', sub:'of total budget', color:'#14b8a6' },
          { label:'Task Completion',   value:tasks.length>0?`${Math.round(doneTasks/tasks.length*100)}%`:'—', sub:`${doneTasks}/${tasks.length} done`, color:'#10b981' },
          { label:'Avg. Progress',     value:`${avgProgress}%`, sub:'across projects', color:'#f59e0b' },
        ].map((s,i)=>(
          <div key={i} style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px' }}>
            <div style={{ fontSize:11, color:'#6b6980', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:28, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#6b6980', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px' }}>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:600, fontSize:15, color:'#e8e6f0', marginBottom:16 }}>Tasks by Status</div>
          {Object.entries(statusMeta).map(([k,v])=>{
            const count = tasks.filter(t=>t.status===k).length;
            return (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:v.color }} />
                    <span style={{ fontSize:12, color:'#9b99b0' }}>{v.label}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:500, color:'#e8e6f0' }}>{count}</span>
                </div>
                <Progress value={tasks.length>0?count/tasks.length*100:0} color={v.color} height={4} />
              </div>
            );
          })}
        </div>

        <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px' }}>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:600, fontSize:15, color:'#e8e6f0', marginBottom:16 }}>Team Workload</div>
          {teamLoad.map(({ user:u, count })=>(
            <div key={u.id} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Avatar user={u} size={20} />
                  <span style={{ fontSize:12, color:'#9b99b0' }}>{u.name.split(' ')[0]}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:500, color:'#e8e6f0' }}>{count} open</span>
              </div>
              <Progress value={maxLoad>0?count/maxLoad*100:0} color={u.color} height={4} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px' }}>
        <div style={{ fontFamily:'Syne, sans-serif', fontWeight:600, fontSize:15, color:'#e8e6f0', marginBottom:16 }}>Budget by Project</div>
        {projects.sort((a,b)=>Number(b.budget)-Number(a.budget)).map(p=>{
          const pct = p.budget>0?Math.round(Number(p.spent)/Number(p.budget)*100):0;
          return (
            <div key={p.id} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12, color:'#9b99b0' }}>{p.name.split(' ').slice(0,3).join(' ')}</span>
                <div style={{ display:'flex', gap:12 }}>
                  <span style={{ fontSize:11, color:'#6b6980' }}>${(Number(p.spent)/1000).toFixed(0)}k / ${(Number(p.budget)/1000).toFixed(0)}k</span>
                  <span style={{ fontSize:12, fontWeight:500, color:pct>90?'#f43f5e':pct>70?'#f59e0b':'#10b981' }}>{pct}%</span>
                </div>
              </div>
              <Progress value={pct} color={p.color} height={5} />
            </div>
          );
        })}
      </div>

      {/* Export row */}
      <div style={{ display:'flex', gap:10, paddingTop:4 }}>
        {[
          { label:'Export Projects CSV', endpoint:'projects.csv', filename:'projects.csv' },
          { label:'Export Tasks CSV',    endpoint:'tasks.csv',    filename:'tasks.csv'    },
          { label:'Export Time Report',  endpoint:'time-report.csv', filename:'time-report.csv' },
        ].map(exp=>(
          <button key={exp.filename}
            onClick={()=>doExport(exp.endpoint, exp.filename)}
            disabled={exporting===exp.filename}
            style={{ padding:'8px 14px', background:'rgba(124,110,247,0.1)', border:'1px solid rgba(124,110,247,0.25)', borderRadius:8, color:'#a394ff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
            {exporting===exp.filename ? 'Downloading…' : `↓ ${exp.label}`}
          </button>
        ))}
      </div>
    </div>
  );
}
export function Timeline() {
  const { projects, loading } = useApp();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];

  const getBar = (start, end) => {
    const s = parseInt(start?.split('-')[1]||1)-1;
    const e = parseInt(end?.split('-')[1]||6)-1;
    return { left:`${s/8*100}%`, width:`${Math.max((e-s+1)/8*100,5)}%` };
  };

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32} /></div>;

  return (
    <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
      <div style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:22, color:'#e8e6f0', marginBottom:4 }}>Timeline</div>
      <div style={{ color:'#6b6980', fontSize:13, marginBottom:24 }}>Project Gantt view · 2024</div>
      <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding:'12px 20px', borderRight:'1px solid rgba(255,255,255,0.07)', fontSize:10, color:'#6b6980', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>Project</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', padding:'12px 0' }}>
            {months.map((m,i)=>(
              <div key={m} style={{ textAlign:'center', fontSize:11, color:i===2?'#7c6ef7':'#6b6980', fontWeight:i===2?600:400 }}>{m}</div>
            ))}
          </div>
        </div>
        {projects.map((p,pi)=>{
          const bar = getBar(p.start_date, p.due_date);
          const sm = statusMeta[p.status];
          return (
            <div key={p.id} style={{ display:'grid', gridTemplateColumns:'240px 1fr', borderBottom:'1px solid rgba(255,255,255,0.05)', background:pi%2===1?'rgba(255,255,255,0.01)':'transparent' }}>
              <div style={{ padding:'14px 20px', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:p.color, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#e8e6f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>{p.name}</div>
                  <div style={{ fontSize:10, color:'#6b6980' }}>{p.progress}% · <span style={{ color:sm?.color }}>{sm?.label}</span></div>
                </div>
              </div>
              <div style={{ position:'relative', padding:'10px 0', display:'flex', alignItems:'center' }}>
                <div style={{ position:'absolute', left:bar.left, width:bar.width, height:22, background:`${p.color}25`, border:`1px solid ${p.color}50`, borderRadius:6, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${p.progress}%`, background:`${p.color}50`, transition:'width 0.4s' }} />
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', paddingLeft:6 }}>
                    <span style={{ fontSize:10, color:p.color, fontWeight:600 }}>{p.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr' }}>
          <div style={{ padding:'10px 20px', borderRight:'1px solid rgba(255,255,255,0.07)' }} />
          <div style={{ position:'relative', height:28 }}>
            <div style={{ position:'absolute', left:'25%', top:0, bottom:0, width:1.5, background:'#7c6ef7', opacity:0.5 }}>
              <div style={{ position:'absolute', top:4, left:4, fontSize:10, color:'#7c6ef7', whiteSpace:'nowrap', fontWeight:500 }}>Today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
