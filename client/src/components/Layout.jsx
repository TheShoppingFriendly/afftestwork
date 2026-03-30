import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../context/AppContext';
import { Toast } from './ui';

export default function Layout() {
  const { toast } = useApp();
  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: '#0a0a0f' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
