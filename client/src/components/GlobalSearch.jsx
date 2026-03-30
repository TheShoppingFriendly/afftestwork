import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { statusMeta, priorityMeta, Avatar } from './ui';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Cmd/Ctrl + K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setResults(null); setSelected(0); }
  }, [open]);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim() || q.length < 2) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setResults(res.data);
        setSelected(0);
      } catch {} finally { setLoading(false); }
    }, 250);
  }, []);

  const allItems = results ? [
    ...( results.projects.map(p => ({ type: 'project', ...p }))),
    ...( results.tasks.map(t => ({ type: 'task', ...t }))),
    ...( results.users.map(u => ({ type: 'user', ...u }))),
  ] : [];

  const go = (item) => {
    setOpen(false);
    if (item.type === 'project') navigate(`/projects/${item.id}`);
    else if (item.type === 'task') navigate(`/projects/${item.project_id}`);
    else if (item.type === 'user') navigate('/team');
  };

  const handleKey = (e) => {
    if (!allItems.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && allItems[selected]) go(allItems[selected]);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
      color: '#6b6980', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      <span style={{ fontSize: 14 }}>🔍</span>
      Search...
      <kbd style={{ marginLeft: 4, padding: '1px 6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 10, color: '#6b6980' }}>⌘K</kbd>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }} onClick={() => setOpen(false)}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 560, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: (results || loading) ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
          <span style={{ fontSize: 16, color: '#6b6980', flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); search(e.target.value); }}
            onKeyDown={handleKey}
            placeholder="Search projects, tasks, people..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#e8e6f0', fontSize: 15, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
          />
          {loading && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#7c6ef7', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
          {!loading && query && <button onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }} style={{ color: '#6b6980', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>}
        </div>

        {/* Results */}
        {results && allItems.length === 0 && (
          <div style={{ padding: '28px 18px', textAlign: 'center', color: '#6b6980', fontSize: 13 }}>
            No results for "{query}"
          </div>
        )}
        {allItems.length > 0 && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {/* Projects */}
            {results.projects.length > 0 && (
              <Section label="Projects">
                {results.projects.map((p, i) => {
                  const idx = i;
                  return (
                    <ResultItem key={p.id} active={selected === idx} onClick={() => go({ type:'project', ...p })} onMouseEnter={() => setSelected(idx)}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#6b6980' }}>{p.type} · {p.client}</div>
                      </div>
                      <StatusPill status={p.status} />
                    </ResultItem>
                  );
                })}
              </Section>
            )}

            {/* Tasks */}
            {results.tasks.length > 0 && (
              <Section label="Tasks">
                {results.tasks.map((t, i) => {
                  const idx = results.projects.length + i;
                  const pm = priorityMeta[t.priority];
                  return (
                    <ResultItem key={t.id} active={selected === idx} onClick={() => go({ type:'task', ...t })} onMouseEnter={() => setSelected(idx)}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${pm?.color}`, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: '#6b6980' }}>{t.project_name}</div>
                      </div>
                      <StatusPill status={t.status} />
                    </ResultItem>
                  );
                })}
              </Section>
            )}

            {/* Users */}
            {results.users.length > 0 && (
              <Section label="People">
                {results.users.map((u, i) => {
                  const idx = results.projects.length + results.tasks.length + i;
                  return (
                    <ResultItem key={u.id} active={selected === idx} onClick={() => go({ type:'user', ...u })} onMouseEnter={() => setSelected(idx)}>
                      <Avatar user={u} size={24} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6f0' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#6b6980' }}>{u.team} · {u.role}</div>
                      </div>
                    </ResultItem>
                  );
                })}
              </Section>
            )}
          </div>
        )}

        {/* Footer hint */}
        {!results && !loading && (
          <div style={{ padding: '12px 18px', display: 'flex', gap: 16 }}>
            {[['↑↓','Navigate'],['↵','Open'],['Esc','Close']].map(([k,l]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, color: '#9b99b0' }}>{k}</kbd>
                <span style={{ fontSize: 11, color: '#6b6980' }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ padding: '8px 18px 4px', fontSize: 10, fontWeight: 600, color: '#6b6980', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {children}
    </div>
  );
}

function ResultItem({ children, active, onClick, onMouseEnter }) {
  return (
    <div onClick={onClick} onMouseEnter={onMouseEnter} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', cursor: 'pointer',
      background: active ? 'rgba(124,110,247,0.12)' : 'transparent', transition: 'background 0.1s',
    }}>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const s = statusMeta[status];
  if (!s) return null;
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>;
}
