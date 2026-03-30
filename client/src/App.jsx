import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Projects, ProjectDetail, NewProject } from './pages/Projects';
import { Tasks, Team, Analytics, Timeline } from './pages/OtherPages';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

const base = import.meta.env.BASE_URL || '/';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={base}>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/new" element={<ProtectedRoute roles={['admin','manager']}><NewProject /></ProtectedRoute>} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="team" element={<Team />} />
                <Route path="analytics" element={<ProtectedRoute roles={['admin','manager']}><Analytics /></ProtectedRoute>} />
                <Route path="timeline" element={<Timeline />} />
                <Route path="settings" element={<Settings />} />
                <Route path="admin" element={<ProtectedRoute roles={['admin','manager']}><Admin /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
