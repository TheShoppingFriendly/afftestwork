const router = require('express').Router();
const { body, query } = require('express-validator');
const { sql } = require('../db');
const { authenticate, authorize, projectAccess } = require('../middleware/auth');
const { validate } = require('../middleware/error');

// All routes require authentication
router.use(authenticate);

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const { status, search, archived } = req.query;
    const { role, id: userId } = req.user;

    let projects;
    if (['admin', 'manager'].includes(role)) {
      projects = await sql`
        SELECT p.*,
          u.name as lead_name, u.avatar as lead_avatar, u.color as lead_color,
          COALESCE(json_agg(DISTINCT jsonb_build_object('id', pu.id, 'name', pu.name, 'avatar', pu.avatar, 'color', pu.color)) FILTER (WHERE pu.id IS NOT NULL), '[]') as team,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') as open_tasks,
          COUNT(DISTINCT t.id) as total_tasks
        FROM projects p
        LEFT JOIN users u ON p.lead_id = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN users pu ON pm.user_id = pu.id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.is_archived = ${archived === 'true'}
          ${status ? sql`AND p.status = ${status}::project_status` : sql``}
          ${search ? sql`AND (p.name ILIKE ${'%' + search + '%'} OR p.client ILIKE ${'%' + search + '%'})` : sql``}
        GROUP BY p.id, u.name, u.avatar, u.color
        ORDER BY p.updated_at DESC
      `;
    } else {
      projects = await sql`
        SELECT p.*,
          u.name as lead_name, u.avatar as lead_avatar, u.color as lead_color,
          COALESCE(json_agg(DISTINCT jsonb_build_object('id', pu.id, 'name', pu.name, 'avatar', pu.avatar, 'color', pu.color)) FILTER (WHERE pu.id IS NOT NULL), '[]') as team,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') as open_tasks,
          COUNT(DISTINCT t.id) as total_tasks
        FROM projects p
        JOIN project_members my_pm ON p.id = my_pm.project_id AND my_pm.user_id = ${userId}
        LEFT JOIN users u ON p.lead_id = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN users pu ON pm.user_id = pu.id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.is_archived = ${archived === 'true'}
        GROUP BY p.id, u.name, u.avatar, u.color
        ORDER BY p.updated_at DESC
      `;
    }
    res.json(projects);
  } catch (err) { next(err); }
});

// GET /api/projects/:id
router.get('/:id', projectAccess, async (req, res, next) => {
  try {
    const [project] = await sql`
      SELECT p.*,
        u.name as lead_name, u.avatar as lead_avatar, u.color as lead_color,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', pu.id, 'name', pu.name, 'avatar', pu.avatar, 'color', pu.color, 'role', pu.role, 'team', pu.team)) FILTER (WHERE pu.id IS NOT NULL), '[]') as team
      FROM projects p
      LEFT JOIN users u ON p.lead_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN users pu ON pm.user_id = pu.id
      WHERE p.id = ${req.params.id}
      GROUP BY p.id, u.name, u.avatar, u.color, u.role
    `;
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// POST /api/projects
router.post('/', authorize('admin', 'manager'), [
  body('name').trim().isLength({ min: 2, max: 255 }),
  body('type').optional().isString(),
  body('client').optional().isString(),
  body('budget').optional().isNumeric(),
  validate,
], async (req, res, next) => {
  try {
    const { name, type, client, status, priority, startDate, dueDate, budget, description, color, tags, leadId, teamIds } = req.body;

    const [project] = await sql`
      INSERT INTO projects (name, type, client, status, priority, start_date, due_date, budget, description, color, tags, lead_id, created_by)
      VALUES (${name}, ${type||null}, ${client||null}, ${status||'todo'}, ${priority||'medium'}, ${startDate||null}, ${dueDate||null}, ${budget||0}, ${description||null}, ${color||'#7c6ef7'}, ${tags||[]}, ${leadId||null}, ${req.user.id})
      RETURNING *
    `;

    if (teamIds?.length) {
      await sql`INSERT INTO project_members SELECT ${project.id}, unnest(${teamIds}::uuid[]) ON CONFLICT DO NOTHING`;
    }

    // Log activity
    await sql`INSERT INTO activity_log (user_id, project_id, action, meta) VALUES (${req.user.id}, ${project.id}, 'project_created', ${JSON.stringify({ name })})`;

    res.status(201).json(project);
  } catch (err) { next(err); }
});

// PUT /api/projects/:id
router.put('/:id', authorize('admin', 'manager', 'lead'), projectAccess, [
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  validate,
], async (req, res, next) => {
  try {
    const { name, type, client, status, priority, startDate, dueDate, budget, spent, description, color, tags, leadId, progress } = req.body;

    const [project] = await sql`
      UPDATE projects SET
        name        = COALESCE(${name||null}, name),
        type        = COALESCE(${type||null}, type),
        client      = COALESCE(${client||null}, client),
        status      = COALESCE(${status||null}::project_status, status),
        priority    = COALESCE(${priority||null}::task_priority, priority),
        start_date  = COALESCE(${startDate||null}, start_date),
        due_date    = COALESCE(${dueDate||null}, due_date),
        budget      = COALESCE(${budget!=null?budget:null}, budget),
        spent       = COALESCE(${spent!=null?spent:null}, spent),
        description = COALESCE(${description||null}, description),
        color       = COALESCE(${color||null}, color),
        tags        = COALESCE(${tags||null}, tags),
        lead_id     = COALESCE(${leadId||null}, lead_id),
        progress    = COALESCE(${progress!=null?progress:null}, progress)
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    if (!project) return res.status(404).json({ error: 'Project not found' });

    await sql`INSERT INTO activity_log (user_id, project_id, action, meta) VALUES (${req.user.id}, ${project.id}, 'project_updated', ${JSON.stringify({ changes: Object.keys(req.body) })})`;

    res.json(project);
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id  (admin only)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await sql`UPDATE projects SET is_archived = true WHERE id = ${req.params.id}`;
    res.json({ message: 'Project archived' });
  } catch (err) { next(err); }
});

// GET /api/projects/:projectId/activity
router.get('/:projectId/activity', projectAccess, async (req, res, next) => {
  try {
    const activity = await sql`
      SELECT a.*, u.name as user_name, u.avatar, u.color
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ${req.params.projectId}
      ORDER BY a.created_at DESC
      LIMIT 50
    `;
    res.json(activity);
  } catch (err) { next(err); }
});

module.exports = router;
