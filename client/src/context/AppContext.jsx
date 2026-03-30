import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const wsRef = useRef(null);

  // ── Toast ──────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
    const ws = new WebSocket(`${wsUrl}/ws?userId=${user.id}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'notification') {
          setNotifications(ns => [msg.notification, ...ns]);
          showToast(msg.notification.title, 'info');
        }
        if (msg.type === 'task_updated') {
          setTasks(ts => ts.map(t => t.id === msg.task.id ? { ...t, ...msg.task } : t));
        }
        if (msg.type === 'project_updated') {
          setProjects(ps => ps.map(p => p.id === msg.project.id ? { ...p, ...msg.project } : p));
        }
      } catch {}
    };

    ws.onerror = () => {};
    return () => ws.close();
  }, [user, showToast]);

  // ── Load initial data ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, tRes, nRes, uRes, tmRes] = await Promise.all([
          api.get('/projects'),
          api.get('/tasks'),
          api.get('/notifications'),
          api.get('/users'),
          api.get('/teams'),
        ]);
        setProjects(pRes.data);
        setTasks(tRes.data);
        setNotifications(nRes.data);
        setUsers(uRes.data);
        setTeams(tmRes.data);
      } catch (err) {
        showToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, showToast]);

  // ── Projects CRUD ─────────────────────────────────────────
  const createProject = useCallback(async (data) => {
    const res = await api.post('/projects', data);
    setProjects(ps => [res.data, ...ps]);
    showToast('Project created');
    return res.data;
  }, [showToast]);

  const updateProject = useCallback(async (id, data) => {
    const res = await api.put(`/projects/${id}`, data);
    setProjects(ps => ps.map(p => p.id === id ? { ...p, ...res.data } : p));
    showToast('Project updated');
    return res.data;
  }, [showToast]);

  const deleteProject = useCallback(async (id) => {
    await api.delete(`/projects/${id}`);
    setProjects(ps => ps.filter(p => p.id !== id));
    showToast('Project archived');
  }, [showToast]);

  // ── Tasks CRUD ────────────────────────────────────────────
  const createTask = useCallback(async (data) => {
    const res = await api.post('/tasks', data);
    setTasks(ts => [res.data, ...ts]);
    showToast('Task created');
    return res.data;
  }, [showToast]);

  const updateTask = useCallback(async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data);
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...res.data } : t));
    return res.data;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks(ts => ts.filter(t => t.id !== id));
    showToast('Task deleted');
  }, [showToast]);

  // ── Notifications ─────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put('/notifications/read-all');
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppCtx.Provider value={{
      projects, tasks, notifications, users, teams,
      loading, toast, showToast, unreadCount,
      createProject, updateProject, deleteProject,
      createTask, updateTask, deleteTask,
      markRead, markAllRead,
      setProjects, setTasks,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
