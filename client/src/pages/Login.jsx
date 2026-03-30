import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  const quickLogin = async (userEmail) => {
    setEmail(userEmail);
    setPassword('Password123!');
    setLoading(true); setError('');
    try {
      await login(userEmail, 'Password123!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const quickUsers = [
    { email: 'alex@flo.agency',   name: 'Alex',   role: 'admin',   color: '#7c6ef7' },
    { email: 'sam@flo.agency',    name: 'Sam',    role: 'manager', color: '#14b8a6' },
    { email: 'jordan@flo.agency', name: 'Jordan', role: 'lead',    color: '#f43f5e' },
    { email: 'maya@flo.agency',   name: 'Maya',   role: 'member',  color: '#f59e0b' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(124,110,247,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(20,184,166,0.08) 0%, transparent 60%)' }} />
      <div style={{ position: 'relative', width: 400, padding: '44px 40px', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, letterSpacing: '-1px', color: '#e8e6f0' }}>
            <span style={{ color: '#7c6ef7' }}>flo</span>
          </div>
          <div style={{ color: '#6b6980', fontSize: 13, marginTop: 4 }}>Agency Management Platform</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#9b99b0', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@flo.agency" autoComplete="email"
              style={{ width: '100%', padding: '10px 14px', background: '#16161f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e8e6f0', fontSize: 14, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
              onFocus={e => e.target.style.borderColor = '#7c6ef7'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#9b99b0', display: 'block', marginBottom: 6, fontWeight: 500 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              style={{ width: '100%', padding: '10px 14px', background: '#16161f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e8e6f0', fontSize: 14, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
              onFocus={e => e.target.style.borderColor = '#7c6ef7'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
          </div>

          {error && <div style={{ fontSize: 12, color: '#f43f5e', marginBottom: 12, padding: '8px 12px', background: 'rgba(244,63,94,0.1)', borderRadius: 6 }}>{error}</div>}

          <div style={{ fontSize: 11, color: '#6b6980', marginBottom: 20 }}>Default password: <span style={{ color: '#9b99b0', fontFamily: 'monospace' }}>Password123!</span></div>

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#4a3fa0' : '#7c6ef7', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Signing in...</> : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, color: '#6b6980', marginBottom: 10 }}>Quick access:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickUsers.map(u => (
              <button key={u.email} onClick={() => quickLogin(u.email)} disabled={loading}
                style={{ padding: '4px 10px', borderRadius: 6, background: '#16161f', border: '1px solid rgba(255,255,255,0.07)', color: '#9b99b0', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                {u.name} <span style={{ color: '#6b6980', fontSize: 10 }}>({u.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
