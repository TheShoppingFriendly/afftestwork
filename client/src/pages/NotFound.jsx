import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', gap: 16 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 80, fontWeight: 800, color: 'rgba(124,110,247,0.2)', lineHeight: 1 }}>404</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color: '#e8e6f0' }}>Page not found</div>
      <div style={{ fontSize: 14, color: '#6b6980' }}>The page you're looking for doesn't exist.</div>
      <button onClick={() => navigate('/dashboard')}
        style={{ marginTop: 8, padding: '10px 24px', background: '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
        Go to Dashboard
      </button>
    </div>
  );
}
