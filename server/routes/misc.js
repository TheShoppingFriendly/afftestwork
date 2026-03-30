const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { sql } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/error');

router.use(authenticate);

// GET /api/users
router.get('/users', async (req, res, next) => {
  try {
    const users = await sql`SELECT id,name,email,role,team,avatar,color,is_active,last_login,created_at FROM users ORDER BY name ASC`;
    res.json(users);
  } catch (err) { next(err); }
});

// POST /api/users
router.post('/users', authorize('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['admin','manager','lead','member','client']),
  body('password').isLength({ min: 8 }),
  validate,
], async (req, res, next) => {
  try {
    const { name, email, role, team, color, password } = req.body;
    const avatar = name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const hashed = await bcrypt.hash(password, 12);
    const [user] = await sql`
      INSERT INTO users (name,email,password,role,team,avatar,color)
      VALUES (${name},${email},${hashed},${role},${team||null},${avatar},${color||'#7c6ef7'})
      RETURNING id,name,email,role,team,avatar,color,is_active`;
    res.status(201).json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put('/users/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Can only edit your own profile' });
    const { name, team, color, role } = req.body;
    const newRole = req.user.role === 'admin' && role ? role : undefined;
    const [user] = await sql`
      UPDATE users SET
        name  = COALESCE(${name||null}, name),
        team  = COALESCE(${team||null}, team),
        color = COALESCE(${color||null}, color),
        role  = COALESCE(${newRole||null}::user_role, role)
      WHERE id = ${req.params.id}
      RETURNING id,name,email,role,team,avatar,color,is_active`;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/:id/deactivate
router.put('/users/:id/deactivate', authorize('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    await sql`UPDATE users SET is_active=false,refresh_token=NULL WHERE id=${req.params.id}`;
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
});

// PUT /api/users/:id/reset-password
router.put('/users/:id/reset-password', authorize('admin'), [
  body('newPassword').isLength({ min: 8 }), validate,
], async (req, res, next) => {
  try {
    const hashed = await bcrypt.hash(req.body.newPassword, 12);
    await sql`UPDATE users SET password=${hashed},refresh_token=NULL WHERE id=${req.params.id}`;
    res.json({ message: 'Password reset' });
  } catch (err) { next(err); }
});

// GET /api/teams
router.get('/teams', async (req, res, next) => {
  try {
    const teams = await sql`
      SELECT t.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id',u.id,'name',u.name,'avatar',u.avatar,'color',u.color,'role',u.role))
          FILTER (WHERE u.id IS NOT NULL), '[]') as members
      FROM teams t
      LEFT JOIN team_members tm ON t.id=tm.team_id
      LEFT JOIN users u ON tm.user_id=u.id
      GROUP BY t.id ORDER BY t.name ASC`;
    res.json(teams);
  } catch (err) { next(err); }
});

// POST /api/teams
router.post('/teams', authorize('admin','manager'), [
  body('name').trim().isLength({ min: 2 }), validate,
], async (req, res, next) => {
  try {
    const { name, color, description } = req.body;
    const [team] = await sql`INSERT INTO teams(name,color,description) VALUES(${name},${color||'#7c6ef7'},${description||null}) RETURNING *`;
    res.status(201).json(team);
  } catch (err) { next(err); }
});

// GET /api/notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const n = await sql`SELECT * FROM notifications WHERE user_id=${req.user.id} ORDER BY created_at DESC LIMIT 60`;
    res.json(n);
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all
router.put('/notifications/read-all', async (req, res, next) => {
  try {
    await sql`UPDATE notifications SET is_read=true WHERE user_id=${req.user.id}`;
    res.json({ message: 'All marked read' });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', async (req, res, next) => {
  try {
    await sql`UPDATE notifications SET is_read=true WHERE id=${req.params.id} AND user_id=${req.user.id}`;
    res.json({ message: 'Marked read' });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id
router.delete('/notifications/:id', async (req, res, next) => {
  try {
    await sql`DELETE FROM notifications WHERE id=${req.params.id} AND user_id=${req.user.id}`;
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// GET /api/analytics/overview
router.get('/analytics/overview', authorize('admin','manager'), async (req, res, next) => {
  try {
    const [budgetStats] = await sql`SELECT SUM(budget) AS total_budget,SUM(spent) AS total_spent,AVG(progress) AS avg_progress FROM projects WHERE is_archived=false`;
    const [taskStats]   = await sql`SELECT COUNT(*) AS total,COUNT(*) FILTER(WHERE status='done') AS done,COUNT(*) FILTER(WHERE status='in_progress') AS in_progress,COUNT(*) FILTER(WHERE status='blocked') AS blocked,COUNT(*) FILTER(WHERE due_date<CURRENT_DATE AND status!='done') AS overdue FROM tasks`;
    const projectsByStatus = await sql`SELECT status,COUNT(*) AS count FROM projects WHERE is_archived=false GROUP BY status`;
    const tasksByPriority  = await sql`SELECT priority,COUNT(*) AS count FROM tasks GROUP BY priority`;
    const teamWorkload = await sql`
      SELECT u.id,u.name,u.avatar,u.color,u.team,
        COUNT(ta.task_id) FILTER(WHERE t.status!='done') AS open_tasks,
        COUNT(ta.task_id) FILTER(WHERE t.status='done')  AS done_tasks
      FROM users u
      LEFT JOIN task_assignees ta ON u.id=ta.user_id
      LEFT JOIN tasks t ON ta.task_id=t.id
      WHERE u.role!='client' AND u.is_active=true
      GROUP BY u.id,u.name,u.avatar,u.color,u.team ORDER BY open_tasks DESC`;
    const budgetByProject = await sql`SELECT id,name,budget,spent,color,progress,status,ROUND(spent/NULLIF(budget,0)*100) AS pct_used FROM projects WHERE is_archived=false ORDER BY budget DESC`;
    const recentActivity  = await sql`SELECT a.*,u.name AS user_name,u.avatar,u.color FROM activity_log a LEFT JOIN users u ON a.user_id=u.id ORDER BY a.created_at DESC LIMIT 20`;
    res.json({ budgetStats, taskStats, projectsByStatus, tasksByPriority, teamWorkload, budgetByProject, recentActivity });
  } catch (err) { next(err); }
});

// GET /api/analytics/project/:id
router.get('/analytics/project/:id', async (req, res, next) => {
  try {
    const [stats] = await sql`
      SELECT COUNT(*) AS total_tasks,COUNT(*) FILTER(WHERE status='done') AS done_tasks,
        COUNT(*) FILTER(WHERE status='in_progress') AS active_tasks,
        SUM(time_logged) AS total_time_logged,SUM(time_estimate) AS total_time_estimate
      FROM tasks WHERE project_id=${req.params.id}`;
    const tasksByAssignee = await sql`
      SELECT u.id,u.name,u.avatar,u.color,
        COUNT(ta.task_id) FILTER(WHERE t.status!='done') AS open,
        COUNT(ta.task_id) FILTER(WHERE t.status='done')  AS done
      FROM task_assignees ta
      JOIN users u ON ta.user_id=u.id
      JOIN tasks t ON ta.task_id=t.id
      WHERE t.project_id=${req.params.id}
      GROUP BY u.id,u.name,u.avatar,u.color`;
    res.json({ stats, tasksByAssignee });
  } catch (err) { next(err); }
});

module.exports = router;
