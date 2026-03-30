import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Avatar, Badge, FormField, Modal, Spinner } from '../components/ui';
import api from '../utils/api';

const ROLE_COLORS = {
  admin: '#7c6ef7', manager: '#14b8a6', lead: '#f43f5e',
  member: '#f59e0b', client: '#6b6980',
};

const SECTIONS = ['Profile', 'Security', 'Team', 'Users'];

export default function Settings() {
  const { user, isAdmin, isManager } = useAuth();
  const [section, setSection] = useState('Profile');

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e8e6f0', marginBottom: 24 }}>
        Settings
      </div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {SECTIONS.filter(s => {
          if (s === 'Users') return isAdmin;
          if (s === 'Team') return isManager;
          return true;
        }).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{
            padding: '8px 18px', background: 'none', border: 'none',
            borderBottom: `2px solid ${section === s ? '#7c6ef7' : 'transparent'}`,
            color: section === s ? '#7c6ef7' : '#9b99b0',
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: section === s ? 500 : 400,
            cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
          }}>
            {s}
          </button>
        ))}
      </div>
      {section === 'Profile'  && <ProfileSection />}
      {section === 'Security' && <SecuritySection />}
      {section === 'Team'     && isManager && <TeamSection />}
      {section === 'Users'    && isAdmin   && <UsersSection />}
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────
function ProfileSection() {
  const { user, updateUser } = useAuth();
  const { showToast } = useApp();
  const [form, setForm] = useState({ name: user?.name || '', team: user?.team || '', color: user?.color || '#7c6ef7' });
  const [saving, setSaving] = useState(false);
  const colors = ['#7c6ef7','#14b8a6','#f43f5e','#f59e0b','#10b981','#38bdf8','#a855f7','#f97316'];

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${user.id}`, form);
      updateUser(res.data);
      showToast('Profile updated');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: '#1e1e2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
        <Avatar user={{ ...user, ...form }} size={64} />
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 18, color: '#e8e6f0' }}>{form.name || user?.name}</div>
          <div style={{ fontSize: 13, color: '#6b6980', marginTop: 2 }}>{user?.email}</div>
          <Badge label={user?.role} color={ROLE_COLORS[user?.role]} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Display Name">
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{ width: '100%' }} />
        </FormField>
        <FormField label="Team">
          <input value={form.team} onChange={e => setForm(f => ({...f, team: e.target.value}))} placeholder="e.g. Development, Design..." style={{ width: '100%' }} />
        </FormField>
        <FormField label="Avatar Color">
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #e8e6f0' : '3px solid transparent', cursor: 'pointer', transition: 'border 0.15s' }} />
            ))}
          </div>
        </FormField>
        <FormField label="Email">
          <input value={user?.email} disabled style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }} />
        </FormField>

        <button onClick={save} disabled={saving}
          style={{ padding: '10px 24px', background: saving ? '#4a3fa0' : '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── SECURITY ──────────────────────────────────────────────────
function SecuritySection() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.currentPassword) e.currentPassword = 'Required';
    if (form.newPassword.length < 8) e.newPassword = 'Min 8 characters';
    if (!/[A-Z]/.test(form.newPassword)) e.newPassword = 'Must include uppercase letter';
    if (!/[0-9]/.test(form.newPassword)) e.newPassword = 'Must include a number';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true); setErrors({});
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      showToast('Password changed. Please log in again.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrors({ currentPassword: err.response?.data?.error || 'Failed' });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16, color: '#e8e6f0', marginBottom: 20 }}>Change Password</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { key: 'currentPassword', label: 'Current Password' },
          { key: 'newPassword', label: 'New Password' },
          { key: 'confirmPassword', label: 'Confirm New Password' },
        ].map(({ key, label }) => (
          <FormField key={key} label={label} error={errors[key]}>
            <input type="password" value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
              style={{ width: '100%', borderColor: errors[key] ? '#f43f5e' : undefined }} />
          </FormField>
        ))}

        <div style={{ fontSize: 12, color: '#6b6980', background: '#16161f', borderRadius: 8, padding: '10px 14px', lineHeight: 1.7 }}>
          Password must be at least 8 characters and contain an uppercase letter and a number.
        </div>

        <button onClick={save} disabled={saving}
          style={{ padding: '10px 24px', background: saving ? '#4a3fa0' : '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start' }}>
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16, color: '#e8e6f0', marginBottom: 6 }}>Active Sessions</div>
        <div style={{ fontSize: 13, color: '#6b6980', marginBottom: 16 }}>You are currently logged in on this device.</div>
        <div style={{ background: '#16161f', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontSize: 13, color: '#e8e6f0', fontWeight: 500 }}>Current Browser</div>
            <div style={{ fontSize: 11, color: '#6b6980', marginTop: 2 }}>Active now</div>
          </div>
          <div style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: 20 }}>Active</div>
        </div>
      </div>
    </div>
  );
}

// ── TEAM ──────────────────────────────────────────────────────
function TeamSection() {
  const { users, teams } = useApp();

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16, color: '#e8e6f0', marginBottom: 20 }}>Teams</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map(team => {
          const members = users.filter(u => team.members?.some(m => m.id === u.id) || team.members?.includes(u.id));
          return (
            <div key={team.id} style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', borderLeft: `3px solid ${team.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#e8e6f0' }}>{team.name}</div>
                <Badge label={`${members.length} members`} color={team.color} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {users.filter(u => u.team === team.name).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#16161f', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Avatar user={u} size={18} />
                    <span style={{ fontSize: 12, color: '#9b99b0' }}>{u.name}</span>
                    <Badge label={u.role} color={ROLE_COLORS[u.role]} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── USERS (Admin only) ────────────────────────────────────────
function UsersSection() {
  const { users, showToast } = useApp();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const { user: me } = useAuth();

  const deactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? They will be logged out and unable to sign in.`)) return;
    setDeactivating(id);
    try {
      await api.put(`/users/${id}/deactivate`);
      showToast(`${name} deactivated`);
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed', 'error');
    } finally { setDeactivating(null); }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16, color: '#e8e6f0' }}>
          All Users <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6980', fontWeight: 400 }}>({users.length})</span>
        </div>
        <button onClick={() => setInviteOpen(true)}
          style={{ padding: '8px 16px', background: '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
          ＋ Invite User
        </button>
      </div>

      <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['User','Role','Team','Status','Last Login','Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#6b6980', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar user={u} size={30} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6f0' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: '#6b6980' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 8px' }}><Badge label={u.role} color={ROLE_COLORS[u.role]} /></td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: '#9b99b0' }}>{u.team || '—'}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: u.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: u.is_active ? '#10b981' : '#f43f5e' }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 8px', fontSize: 11, color: '#6b6980' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {u.id !== me?.id && u.is_active && (
                    <button onClick={() => deactivate(u.id, u.name)} disabled={deactivating === u.id}
                      style={{ fontSize: 11, color: '#f43f5e', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                      {deactivating === u.id ? '...' : 'Deactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

// ── INVITE USER MODAL ─────────────────────────────────────────
function InviteModal({ onClose }) {
  const { showToast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', role: 'member', team: '', password: '', color: '#7c6ef7' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const colors = ['#7c6ef7','#14b8a6','#f43f5e','#f59e0b','#10b981','#38bdf8','#a855f7'];

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    return e;
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await api.post('/users', form);
      showToast(`${form.name} invited successfully`);
      onClose();
      window.location.reload();
    } catch (err) {
      setErrors({ email: err.response?.data?.error || 'Failed to create user' });
      setSaving(false);
    }
  };

  return (
    <Modal title="Invite Team Member" onClose={onClose} width={480}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Full Name" required error={errors.name}>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={{ width: '100%' }} autoFocus />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Role">
            <select value={form.role} onChange={e => set('role', e.target.value)} style={{ width: '100%' }}>
              {['admin','manager','lead','member','client'].map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Team">
            <input value={form.team} onChange={e => set('team', e.target.value)} placeholder="Development..." style={{ width: '100%' }} />
          </FormField>
        </div>
        <FormField label="Temporary Password" required error={errors.password}>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" style={{ width: '100%' }} />
        </FormField>
        <FormField label="Avatar Color">
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {colors.map(c => (
              <button key={c} onClick={() => set('color', c)}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #e8e6f0' : '3px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </FormField>
        <div style={{ fontSize: 12, color: '#6b6980', background: '#16161f', borderRadius: 8, padding: '10px 14px' }}>
          The user will receive their login credentials and must change their password on first login.
        </div>
      </div>
      <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#9b99b0', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving}
          style={{ padding: '8px 20px', background: saving ? '#4a3fa0' : '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Inviting...' : 'Send Invite'}
        </button>
      </div>
    </Modal>
  );
}
