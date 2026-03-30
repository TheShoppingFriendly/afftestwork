require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sql } = require('./index');

async function seed() {
  console.log('🌱 Seeding database...');

  const hash = await bcrypt.hash('Password123!', 12);

  // ── Users ──────────────────────────────────────────────────
  const users = await sql`
    INSERT INTO users (name, email, password, role, team, avatar, color) VALUES
    ('Alex Rivera',   'alex@test.test',    ${hash}, 'admin',   'Leadership',  'AR', '#7c6ef7'),
    ('Sam Chen',      'sam@test.test',     ${hash}, 'manager', 'Development', 'SC', '#14b8a6'),
    ('Jordan Lee',    'jordan@test.test',  ${hash}, 'lead',    'Design',      'JL', '#f43f5e'),
    ('Maya Patel',    'maya@test.test',    ${hash}, 'member',  'Development', 'MP', '#f59e0b'),
    ('Chris Wang',    'chris@test.test',   ${hash}, 'member',  'Design',      'CW', '#10b981'),
    ('Dana Kim',      'dana@test.test',    ${hash}, 'member',  'Marketing',   'DK', '#38bdf8'),
    ('Riley Moss',    'riley@test.test',   ${hash}, 'lead',    'Marketing',   'RM', '#a855f7'),
    ('Taylor Brooks', 'taylor@test.test',  ${hash}, 'client',  'External',    'TB', '#6b6980')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, email, role
  `;
  console.log(`  ✅ ${users.length} users`);

  const u = {};
  users.forEach(user => { u[user.email.split('@')[0]] = user.id; });

  // ── Teams ──────────────────────────────────────────────────
  const teams = await sql`
    INSERT INTO teams (name, color) VALUES
      ('Development', '#14b8a6'),
      ('Design',      '#f43f5e'),
      ('Marketing',   '#a855f7'),
      ('Leadership',  '#7c6ef7')
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `;
  console.log(`  ✅ ${teams.length} teams`);

  const tm = {};
  teams.forEach(t => { tm[t.name] = t.id; });

  // ── Team members ──────────────────────────────────────────
  const teamAssigns = [
    [tm['Development'], u['sam']], [tm['Development'], u['maya']],
    [tm['Design'],      u['jordan']], [tm['Design'],    u['chris']],
    [tm['Marketing'],   u['dana']], [tm['Marketing'],   u['riley']],
    [tm['Leadership'],  u['alex']],
  ];
  for (const [tid, uid] of teamAssigns) {
    if (tid && uid) await sql`INSERT INTO team_members VALUES (${tid},${uid}) ON CONFLICT DO NOTHING`;
  }
  console.log('  ✅ team_members');

  // ── Projects ──────────────────────────────────────────────
  const projects = await sql`
    INSERT INTO projects (name, type, client, status, priority, progress, start_date, due_date, budget, spent, color, tags, lead_id, created_by, description) VALUES
      ('Apex E-Commerce Platform', 'Web Development',  'Apex Corp',      'in_progress', 'high',     68, '2024-01-15','2024-04-30', 85000, 57800, '#7c6ef7', ARRAY['react','node','postgres'], ${u['sam']},    ${u['alex']}, 'Full-stack e-commerce rebuild with headless CMS'),
      ('Luxe Brand Identity',      'Brand Identity',   'Luxe Fashion',   'review',      'high',     90, '2024-02-01','2024-03-31', 32000, 29500, '#f43f5e', ARRAY['branding','identity'],      ${u['jordan']}, ${u['alex']}, 'Complete brand overhaul including logo, guidelines, assets'),
      ('GrowFast SEO Q2',          'SEO Campaign',     'GrowFast SaaS',  'todo',        'medium',   15, '2024-03-01','2024-06-30', 24000, 3600,  '#f59e0b', ARRAY['seo','content'],            ${u['riley']},  ${u['alex']}, 'Comprehensive SEO strategy and content pipeline'),
      ('Nova Mobile App',          'Mobile App',       'Nova Health',    'in_progress', 'critical', 42, '2024-01-20','2024-05-15',120000, 50400, '#10b981', ARRAY['react-native','ai'],         ${u['sam']},    ${u['alex']}, 'React Native health tracking app with AI features'),
      ('Pulse Social Media',       'Social Media',     'Pulse Fitness',  'in_progress', 'low',      55, '2024-02-15','2024-05-31', 18000, 9900,  '#38bdf8', ARRAY['social','content'],          ${u['riley']},  ${u['alex']}, 'Monthly social media management and content creation'),
      ('Vertex Analytics',         'UI/UX Design',     'Vertex Data',    'backlog',     'medium',    5, '2024-04-01','2024-07-31', 45000, 0,     '#a855f7', ARRAY['ux','data','charts'],        ${u['jordan']}, ${u['alex']}, 'Data visualization dashboard design and development')
    RETURNING id, name
  `;
  console.log(`  ✅ ${projects.length} projects`);

  const p = {};
  projects.forEach(pr => { p[pr.name.split(' ')[0]] = pr.id; });

  // ── Project members ───────────────────────────────────────
  const projMembers = [
    [p['Apex'], u['sam']], [p['Apex'], u['maya']], [p['Apex'], u['jordan']],
    [p['Luxe'], u['jordan']], [p['Luxe'], u['chris']],
    [p['GrowFast'], u['dana']], [p['GrowFast'], u['riley']],
    [p['Nova'], u['sam']], [p['Nova'], u['maya']], [p['Nova'], u['jordan']], [p['Nova'], u['chris']],
    [p['Pulse'], u['dana']], [p['Pulse'], u['riley']],
    [p['Vertex'], u['jordan']], [p['Vertex'], u['chris']], [p['Vertex'], u['sam']],
  ];
  for (const [pid, uid] of projMembers) {
    if (pid && uid) await sql`INSERT INTO project_members VALUES (${pid},${uid}) ON CONFLICT DO NOTHING`;
  }
  console.log('  ✅ project_members');

  // ── Tasks ──────────────────────────────────────────────────
  const tasks = await sql`
    INSERT INTO tasks (project_id, title, description, status, priority, due_date, time_estimate, time_logged, tags, created_by) VALUES
      (${p['Apex']}, 'Set up CI/CD pipeline',        'Configure GitHub Actions for automated testing',   'done',        'high',     '2024-02-15', 600,  480,  ARRAY['devops'],           ${u['sam']}),
      (${p['Apex']}, 'Product listing API',           'Build REST API for product catalog',               'in_progress', 'high',     '2024-03-20', 720,  360,  ARRAY['backend','api'],    ${u['sam']}),
      (${p['Apex']}, 'Checkout flow redesign',        'Redesign checkout UX based on user research',      'review',      'critical', '2024-03-25', 600,  540,  ARRAY['ux','design'],      ${u['jordan']}),
      (${p['Apex']}, 'Payment gateway integration',   'Integrate Stripe with subscription support',       'todo',        'high',     '2024-04-05', 480,  0,    ARRAY['payments'],         ${u['sam']}),
      (${p['Apex']}, 'Performance optimization',      'Run Lighthouse audits and fix issues',             'todo',        'medium',   '2024-04-15', 300,  0,    ARRAY['performance'],      ${u['sam']}),
      (${p['Luxe']}, 'Logo concepts presentation',    'Present 3 logo directions to client',              'done',        'high',     '2024-02-20', 900,  960,  ARRAY['logo'],             ${u['jordan']}),
      (${p['Luxe']}, 'Brand guidelines document',     'Compile comprehensive brand guidelines PDF',       'review',      'medium',   '2024-03-28', 600,  480,  ARRAY['guidelines'],       ${u['jordan']}),
      (${p['GrowFast']}, 'Keyword research',          'Complete keyword analysis for all target pages',   'todo',        'high',     '2024-03-15', 480,  60,   ARRAY['keywords'],         ${u['riley']}),
      (${p['Nova']}, 'Authentication module',         'Implement OAuth2 + biometric login',               'in_progress', 'critical', '2024-03-30', 960,  720,  ARRAY['auth','security'],  ${u['sam']}),
      (${p['Nova']}, 'Health metrics dashboard',      'Design and build the main health metrics UI',      'in_progress', 'high',     '2024-04-10', 720,  480,  ARRAY['ui','charts'],      ${u['jordan']}),
      (${p['Pulse']}, 'March content calendar',       'Create and schedule all March social content',     'done',        'medium',   '2024-02-28', 360,  360,  ARRAY['content'],          ${u['riley']}),
      (${p['Pulse']}, 'Instagram Reels batch',        'Produce 8 Reels for April campaign',               'in_progress', 'medium',   '2024-04-01', 600,  240,  ARRAY['video','social'],   ${u['riley']})
    RETURNING id, title
  `;
  console.log(`  ✅ ${tasks.length} tasks`);

  // ── Task assignees ─────────────────────────────────────────
  const taskAssigns = [
    [tasks[0].id, u['sam']],  [tasks[1].id, u['maya']], [tasks[2].id, u['jordan']],
    [tasks[2].id, u['chris']],[tasks[3].id, u['maya']], [tasks[4].id, u['sam']],
    [tasks[5].id, u['jordan']],[tasks[6].id, u['jordan']],[tasks[6].id, u['chris']],
    [tasks[7].id, u['riley']],[tasks[8].id, u['sam']], [tasks[8].id, u['maya']],
    [tasks[9].id, u['chris']],[tasks[10].id, u['dana']],[tasks[11].id, u['dana']],
    [tasks[11].id, u['riley']],
  ];
  for (const [tid, uid] of taskAssigns) {
    if (tid && uid) await sql`INSERT INTO task_assignees VALUES (${tid},${uid}) ON CONFLICT DO NOTHING`;
  }
  console.log('  ✅ task_assignees');

  // ── Sample notifications ──────────────────────────────────
  await sql`
    INSERT INTO notifications (user_id, type, title, body) VALUES
      (${u['alex']}, 'mention',  'Jordan mentioned you', 'Mentioned in Checkout flow redesign'),
      (${u['alex']}, 'deadline', 'Deadline approaching',  'Nova Mobile App milestone due in 2 days'),
      (${u['sam']},  'assign',   'New task assigned',     'You were assigned to Authentication module'),
      (${u['jordan']},'comment', 'New comment',           'Sam commented on Brand guidelines document')
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✅ notifications');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   All users → Password: Password123!');
console.log('   Emails: alex@test.test, sam@test.test, jordan@test.test,');
console.log('           maya@test.test, chris@test.test, dana@test.test,');
console.log('           riley@test.test, taylor@test.test');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
