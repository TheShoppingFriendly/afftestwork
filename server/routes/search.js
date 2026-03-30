const router = require('express').Router();
const { sql } = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/search?q=term
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ projects: [], tasks: [], users: [] });

    const term = `%${q.trim()}%`;
    const { role, id: userId } = req.user;
    const isAdmin = ['admin','manager'].includes(role);

    const [projects, tasks, users] = await Promise.all([
      // Projects
      isAdmin
        ? sql`SELECT id, name, type, client, status, color FROM projects WHERE is_archived=false AND (name ILIKE ${term} OR client ILIKE ${term} OR description ILIKE ${term}) LIMIT 5`
        : sql`SELECT p.id, p.name, p.type, p.client, p.status, p.color FROM projects p JOIN project_members pm ON p.id=pm.project_id AND pm.user_id=${userId} WHERE p.is_archived=false AND (p.name ILIKE ${term} OR p.client ILIKE ${term}) LIMIT 5`,

      // Tasks
      isAdmin
        ? sql`SELECT t.id, t.title, t.status, t.priority, t.project_id, p.name AS project_name, p.color AS project_color FROM tasks t JOIN projects p ON t.project_id=p.id WHERE t.title ILIKE ${term} OR t.description ILIKE ${term} LIMIT 8`
        : sql`SELECT t.id, t.title, t.status, t.priority, t.project_id, p.name AS project_name, p.color AS project_color FROM tasks t JOIN projects p ON t.project_id=p.id JOIN task_assignees ta ON t.id=ta.task_id AND ta.user_id=${userId} WHERE t.title ILIKE ${term} LIMIT 8`,

      // Users (only admins/managers)
      isAdmin
        ? sql`SELECT id, name, email, role, team, avatar, color FROM users WHERE name ILIKE ${term} OR email ILIKE ${term} LIMIT 5`
        : sql`SELECT '' as placeholder LIMIT 0`,
    ]);

    res.json({ projects, tasks, users: isAdmin ? users : [] });
  } catch (err) { next(err); }
});

module.exports = router;
