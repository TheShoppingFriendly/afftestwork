const router = require('express').Router();
const { body } = require('express-validator');
const { sql } = require('../db');
const { authenticate, authorize, projectAccess } = require('../middleware/auth');
const { validate } = require('../middleware/error');

router.use(authenticate);

// GET /api/tasks  (my tasks or all for admin/manager)
router.get('/', async (req, res, next) => {
  try {
    const { status, priority, projectId } = req.query;
    const { role, id: userId } = req.user;

    const tasks = await sql`
      SELECT t.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar, 'color', u.color)) FILTER (WHERE u.id IS NOT NULL), '[]') as assignees,
        COUNT(DISTINCT c.id) as comment_count
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN comments c ON t.id = c.task_id
      ${!['admin','manager'].includes(role) ? sql`
        JOIN task_assignees my_ta ON t.id = my_ta.task_id AND my_ta.user_id = ${userId}
      ` : sql``}
      WHERE 1=1
        ${status ? sql`AND t.status = ${status}::task_status` : sql``}
        ${priority ? sql`AND t.priority = ${priority}::task_priority` : sql``}
        ${projectId ? sql`AND t.project_id = ${projectId}` : sql``}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    res.json(tasks);
  } catch (err) { next(err); }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [task] = await sql`
      SELECT t.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar, 'color', u.color)) FILTER (WHERE u.id IS NOT NULL), '[]') as assignees,
        p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ${req.params.id}
      GROUP BY t.id, p.name, p.color
    `;
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
});

// POST /api/tasks
router.post('/', authorize('admin','manager','lead'), [
  body('title').trim().isLength({ min: 2, max: 500 }),
  body('projectId').isUUID(),
  validate,
], async (req, res, next) => {
  try {
    const { title, description, projectId, status, priority, dueDate, timeEstimate, tags, assigneeIds } = req.body;

    const [task] = await sql`
      INSERT INTO tasks (title, description, project_id, status, priority, due_date, time_estimate, tags, created_by)
      VALUES (${title}, ${description||null}, ${projectId}, ${status||'todo'}, ${priority||'medium'}, ${dueDate||null}, ${timeEstimate||0}, ${tags||[]}, ${req.user.id})
      RETURNING *
    `;

    if (assigneeIds?.length) {
      await sql`INSERT INTO task_assignees SELECT ${task.id}, unnest(${assigneeIds}::uuid[]) ON CONFLICT DO NOTHING`;

      // Notify each assignee
      for (const uid of assigneeIds) {
        if (uid !== req.user.id) {
          await sql`INSERT INTO notifications (user_id, type, title, body) VALUES (${uid}, 'assign', 'New task assigned', ${`You were assigned to "${title}"`})`;
        }
      }
    }

    await sql`INSERT INTO activity_log (user_id, project_id, task_id, action, meta) VALUES (${req.user.id}, ${projectId}, ${task.id}, 'task_created', ${JSON.stringify({ title })})`;

    res.status(201).json(task);
  } catch (err) { next(err); }
});

// PUT /api/tasks/:id
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 2, max: 500 }),
  validate,
], async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, timeEstimate, tags, assigneeIds } = req.body;

    const [old] = await sql`SELECT * FROM tasks WHERE id = ${req.params.id}`;
    if (!old) return res.status(404).json({ error: 'Task not found' });

    // Members can only update tasks assigned to them
    if (req.user.role === 'member') {
      const [assigned] = await sql`SELECT 1 FROM task_assignees WHERE task_id = ${req.params.id} AND user_id = ${req.user.id}`;
      if (!assigned) return res.status(403).json({ error: 'Not assigned to this task' });
    }

    const [task] = await sql`
      UPDATE tasks SET
        title         = COALESCE(${title||null}, title),
        description   = COALESCE(${description||null}, description),
        status        = COALESCE(${status||null}::task_status, status),
        priority      = COALESCE(${priority||null}::task_priority, priority),
        due_date      = COALESCE(${dueDate||null}, due_date),
        time_estimate = COALESCE(${timeEstimate!=null?timeEstimate:null}, time_estimate),
        tags          = COALESCE(${tags||null}, tags)
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    if (assigneeIds) {
      await sql`DELETE FROM task_assignees WHERE task_id = ${req.params.id}`;
      if (assigneeIds.length) {
        await sql`INSERT INTO task_assignees SELECT ${req.params.id}, unnest(${assigneeIds}::uuid[]) ON CONFLICT DO NOTHING`;
      }
    }

    // Notify on status change
    if (status && status !== old.status) {
      const assignees = await sql`SELECT user_id FROM task_assignees WHERE task_id = ${req.params.id}`;
      for (const { user_id } of assignees) {
        if (user_id !== req.user.id) {
          await sql`INSERT INTO notifications (user_id, type, title, body) VALUES (${user_id}, 'status', 'Task status updated', ${`"${old.title}" moved to ${status}`})`;
        }
      }
    }

    await sql`INSERT INTO activity_log (user_id, project_id, task_id, action, meta) VALUES (${req.user.id}, ${task.project_id}, ${task.id}, 'task_updated', ${JSON.stringify({ changes: Object.keys(req.body) })})`;

    res.json(task);
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:id
router.delete('/:id', authorize('admin','manager','lead'), async (req, res, next) => {
  try {
    await sql`DELETE FROM tasks WHERE id = ${req.params.id}`;
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const comments = await sql`
      SELECT c.*, u.name, u.avatar, u.color
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ${req.params.id}
      ORDER BY c.created_at ASC
    `;
    res.json(comments);
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', [
  body('content').trim().isLength({ min: 1, max: 5000 }),
  validate,
], async (req, res, next) => {
  try {
    const [comment] = await sql`
      INSERT INTO comments (task_id, user_id, content) VALUES (${req.params.id}, ${req.user.id}, ${req.body.content})
      RETURNING *
    `;
    await sql`UPDATE tasks SET attachments = attachments WHERE id = ${req.params.id}`;

    // Notify assignees
    const [task] = await sql`SELECT title, project_id FROM tasks WHERE id = ${req.params.id}`;
    const assignees = await sql`SELECT user_id FROM task_assignees WHERE task_id = ${req.params.id}`;
    for (const { user_id } of assignees) {
      if (user_id !== req.user.id) {
        await sql`INSERT INTO notifications (user_id, type, title, body) VALUES (${user_id}, 'comment', 'New comment', ${`${req.user.name} commented on "${task.title}"`})`;
      }
    }
    await sql`INSERT INTO activity_log (user_id, project_id, task_id, action) VALUES (${req.user.id}, ${task.project_id}, ${req.params.id}, 'comment_added')`;

    const [full] = await sql`SELECT c.*, u.name, u.avatar, u.color FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ${comment.id}`;
    res.status(201).json(full);
  } catch (err) { next(err); }
});

// POST /api/tasks/:id/time
router.post('/:id/time', [
  body('minutes').isInt({ min: 1 }),
  validate,
], async (req, res, next) => {
  try {
    const { minutes, note } = req.body;
    await sql`INSERT INTO time_logs (task_id, user_id, minutes, note) VALUES (${req.params.id}, ${req.user.id}, ${minutes}, ${note||null})`;
    await sql`UPDATE tasks SET time_logged = time_logged + ${minutes} WHERE id = ${req.params.id}`;
    res.json({ message: 'Time logged', minutes });
  } catch (err) { next(err); }
});

module.exports = router;
