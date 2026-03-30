const router = require('express').Router();
const { sql } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

function toCSV(rows, cols) {
  const header = cols.join(',');
  const lines = rows.map(r =>
    cols.map(c => {
      const v = r[c] ?? '';
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

// GET /api/export/projects.csv
router.get('/projects.csv', authorize('admin','manager'), async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT name, type, client, status, priority, progress,
             start_date, due_date, budget, spent,
             ROUND(spent/NULLIF(budget,0)*100) AS budget_pct,
             tags, created_at
      FROM projects WHERE is_archived=false ORDER BY name`;
    const csv = toCSV(rows, ['name','type','client','status','priority','progress','start_date','due_date','budget','spent','budget_pct','created_at']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="projects.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /api/export/tasks.csv
router.get('/tasks.csv', authorize('admin','manager'), async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT t.title, t.status, t.priority, t.due_date,
             t.time_estimate, t.time_logged, t.tags,
             p.name AS project, p.client,
             STRING_AGG(u.name, ', ') AS assignees,
             t.created_at
      FROM tasks t
      JOIN projects p ON t.project_id=p.id
      LEFT JOIN task_assignees ta ON t.id=ta.task_id
      LEFT JOIN users u ON ta.user_id=u.id
      GROUP BY t.id, p.name, p.client
      ORDER BY t.created_at DESC`;
    const csv = toCSV(rows, ['title','project','client','status','priority','assignees','due_date','time_estimate','time_logged','created_at']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /api/export/time-report.csv
router.get('/time-report.csv', authorize('admin','manager'), async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT u.name AS team_member, p.name AS project, t.title AS task,
             tl.minutes, tl.note, tl.logged_at
      FROM time_logs tl
      JOIN users u ON tl.user_id=u.id
      JOIN tasks t ON tl.task_id=t.id
      JOIN projects p ON t.project_id=p.id
      ORDER BY tl.logged_at DESC`;
    const csv = toCSV(rows, ['team_member','project','task','minutes','note','logged_at']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="time-report.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

module.exports = router;
