import { useState } from 'react';

export const statusMeta = {
  backlog:     { label: 'Backlog',     color: '#6b6980', bg: 'rgba(107,105,128,0.15)' },
  todo:        { label: 'To Do',       color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
  in_progress: { label: 'In Progress', color: '#7c6ef7', bg: 'rgba(124,110,247,0.15)' },
  review:      { label: 'Review',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  done:        { label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
  blocked:     { label: 'Blocked',     color: '#f43f5e', bg: 'rgba(244,63,94,0.15)'   },
};

export const priorityMeta = {
  critical: { label: 'Critical', color: '#f43f5e' },
  high:     { label: 'High',     color: '#f59e0b' },
  medium:   { label: 'Medium',   color: '#7c6ef7' },
  low:      { label: 'Low',      color: '#6b6980' },
};

export const typeIcons = {
  'Web Development':  '⬡', 'Mobile App':       '◈', 'Brand Identity': '◆',
  'SEO Campaign':     '◉', 'Social Media':     '◍', 'Content Strategy':'◎',
  'UI/UX Design':     '◐', 'Video Production': '◑', 'Email Marketing': '◒',
  'Analytics':        '◓',
};

export const Avatar = ({ user, size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: `${user?.color || '#7c6ef7'}25`,
    border: `1.5px solid ${user?.color || '#7c6ef7'}60`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.35, fontWeight: 600, color: user?.color || '#7c6ef7',
    flexShrink: 0, fontFamily: 'Syne, sans-serif',
    userSelect: 'none',
  }}>
    {user?.avatar || '??'}
  </div>
);

export const Badge = ({ label, color, bg }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    borderRadius: 6, background: bg || `${color}20`,
    color: color || 'var(--text2)', fontSize: 11, fontWeight: 500,
    letterSpacing: '0.02em', whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

export const Progress = ({ value, color = '#7c6ef7', height = 4 }) => (
  <div style={{ height, background: 'var(--border)', borderRadius: height, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(100, value || 0)}%`, background: color, borderRadius: height, transition: 'width 0.4s ease' }} />
  </div>
);

export const Pill = ({ children, active, onClick, color }) => (
  <button onClick={onClick} style={{
    padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 500,
    border: `1px solid ${active ? (color || 'var(--accent)') : 'var(--border)'}`,
    background: active ? `${color || 'var(--accent)'}20` : 'transparent',
    color: active ? (color || 'var(--accent)') : 'var(--text2)',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
);

export const Spinner = ({ size = 20 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `2px solid var(--border)`, borderTopColor: 'var(--accent)',
    animation: 'spin 0.7s linear infinite',
  }} />
);

export const Modal = ({ title, onClose, children, width = 520 }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
    onClick={onClose}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{ width, maxWidth: '100%', maxHeight: '90vh', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{title}</div>
        <button onClick={onClose} style={{ color: 'var(--text3)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

export const FormField = ({ label, required, error, children }) => (
  <div>
    <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
      {label}{required && <span style={{ color: 'var(--rose)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{error}</div>}
  </div>
);

export const Toast = ({ toast }) => {
  if (!toast) return null;
  const colors = { success: '#10b981', error: '#f43f5e', info: '#7c6ef7', warning: '#f59e0b' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${colors[toast.type] || colors.success}`,
      borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--shadow-lg)',
      fontSize: 13, color: 'var(--text)', maxWidth: 320,
      animation: 'slideInRight 0.3s ease',
    }}>
      {toast.msg}
    </div>
  );
};

export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
    <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>{icon}</div>
    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16, color: 'var(--text2)', marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, marginBottom: action ? 20 : 0 }}>{subtitle}</div>
    {action}
  </div>
);
