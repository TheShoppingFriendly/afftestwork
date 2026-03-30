require('dotenv').config();
const { sql } = require('./index');

async function migrate() {
  console.log('🔄 Running migrations...');

  await sql`
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'lead', 'member', 'client')
  `.catch(() => console.log('  user_role type already exists'));

  await sql`
    CREATE TYPE project_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked')
  `.catch(() => console.log('  project_status type already exists'));

  await sql`
    CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked')
  `.catch(() => console.log('  task_status type already exists'));

  await sql`
    CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low')
  `.catch(() => console.log('  task_priority type already exists'));

  await sql`
    CREATE TYPE notification_type AS ENUM ('mention', 'deadline', 'comment', 'status', 'assign', 'project')
  `.catch(() => console.log('  notification_type type already exists'));

  // ── Users ──────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(100) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      role        user_role NOT NULL DEFAULT 'member',
      team        VARCHAR(100),
      avatar      VARCHAR(10),
      color       VARCHAR(20) DEFAULT '#7c6ef7',
      refresh_token TEXT,
      is_active   BOOLEAN DEFAULT true,
      last_login  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ users table');

  // ── Teams ──────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(100) NOT NULL,
      color       VARCHAR(20) DEFAULT '#7c6ef7',
      description TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ teams table');

  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
      user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, user_id)
    )
  `;
  console.log('  ✅ team_members table');

  // ── Projects ───────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          VARCHAR(255) NOT NULL,
      description   TEXT,
      type          VARCHAR(100),
      client        VARCHAR(255),
      status        project_status DEFAULT 'todo',
      priority      task_priority DEFAULT 'medium',
      progress      INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      start_date    DATE,
      due_date      DATE,
      budget        NUMERIC(12,2) DEFAULT 0,
      spent         NUMERIC(12,2) DEFAULT 0,
      color         VARCHAR(20) DEFAULT '#7c6ef7',
      tags          TEXT[] DEFAULT '{}',
      lead_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
      is_archived   BOOLEAN DEFAULT false,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ projects table');

  await sql`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    )
  `;
  console.log('  ✅ project_members table');

  // ── Tasks ──────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
      title           VARCHAR(500) NOT NULL,
      description     TEXT,
      status          task_status DEFAULT 'todo',
      priority        task_priority DEFAULT 'medium',
      due_date        DATE,
      time_estimate   INTEGER DEFAULT 0,
      time_logged     INTEGER DEFAULT 0,
      tags            TEXT[] DEFAULT '{}',
      attachments     INTEGER DEFAULT 0,
      position        INTEGER DEFAULT 0,
      created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ tasks table');

  await sql`
    CREATE TABLE IF NOT EXISTS task_assignees (
      task_id   UUID REFERENCES tasks(id) ON DELETE CASCADE,
      user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, user_id)
    )
  `;
  console.log('  ✅ task_assignees table');

  // ── Comments ───────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ comments table');

  // ── Activity Log ───────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
      task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
      action      VARCHAR(100) NOT NULL,
      meta        JSONB DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ activity_log table');

  // ── Notifications ──────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      type        notification_type NOT NULL,
      title       VARCHAR(255) NOT NULL,
      body        TEXT,
      link        VARCHAR(500),
      is_read     BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ notifications table');

  // ── Time Logs ──────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS time_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      minutes     INTEGER NOT NULL CHECK (minutes > 0),
      note        TEXT,
      logged_at   DATE DEFAULT CURRENT_DATE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✅ time_logs table');

  // ── Indexes ────────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  console.log('  ✅ indexes');

  // ── Updated_at trigger ─────────────────────────────────────
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql
  `;
  for (const tbl of ['users', 'projects', 'tasks', 'comments']) {
    await sql`
      DROP TRIGGER IF EXISTS ${sql.unsafe(`set_updated_at_${tbl}`)} ON ${sql.unsafe(tbl)}
    `.catch(() => {});
    await sql`
      CREATE TRIGGER ${sql.unsafe(`set_updated_at_${tbl}`)}
      BEFORE UPDATE ON ${sql.unsafe(tbl)}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `.catch(() => {});
  }
  console.log('  ✅ triggers');

  console.log('\n🎉 Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
