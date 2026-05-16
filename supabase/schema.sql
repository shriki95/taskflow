-- ══════════════════════════════════════════════════════════════
-- TaskFlow — Supabase Schema
-- הרץ את הקובץ הזה בתוך Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  avatar_color  TEXT NOT NULL DEFAULT '#7c3aed',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  color         TEXT NOT NULL DEFAULT '#7c3aed',
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Project Members ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'todo'    CHECK (status IN ('todo','in_progress','done')),
  priority      TEXT NOT NULL DEFAULT 'medium'  CHECK (priority IN ('low','medium','high')),
  due_date      DATE,
  assignee_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_minutes INTEGER,
  span_days        INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Existing DB: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
-- Existing DB: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS span_days INTEGER;

-- ── Subtasks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Comments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#7c3aed')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update tasks.updated_at
CREATE OR REPLACE FUNCTION handle_task_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_task_updated ON tasks;
CREATE TRIGGER on_task_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_updated();

-- ══════════════════════════════════════════════════════════════
-- HELPER FUNCTION: check project membership
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments          ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──────────────────────────────────────────────────
CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ── Projects ──────────────────────────────────────────────────
CREATE POLICY "projects_member_select" ON projects
  FOR SELECT USING (is_project_member(id));

CREATE POLICY "projects_auth_insert" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "projects_owner_update" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "projects_owner_delete" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- ── Project Members ───────────────────────────────────────────
CREATE POLICY "members_can_see_members" ON project_members
  FOR SELECT USING (is_project_member(project_id));

CREATE POLICY "owner_can_add_members" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- ── Tasks ─────────────────────────────────────────────────────
CREATE POLICY "tasks_member_all" ON tasks
  FOR ALL USING (is_project_member(project_id));

-- ── Subtasks ──────────────────────────────────────────────────
CREATE POLICY "subtasks_member_all" ON subtasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_project_member(t.project_id)
    )
  );

-- ── Comments ──────────────────────────────────────────────────
CREATE POLICY "comments_member_all" ON comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_project_member(t.project_id)
    )
  );
