-- Add invitation status to project_members
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted';

-- Allow invited users to accept their invitation (update own row)
DROP POLICY IF EXISTS "members_can_update_own_status" ON project_members;
CREATE POLICY "members_can_update_own_status" ON project_members
  FOR UPDATE USING (user_id = auth.uid());

-- Allow members to leave / decline invite (delete own row, but not if owner)
DROP POLICY IF EXISTS "members_can_leave" ON project_members;
CREATE POLICY "members_can_leave" ON project_members
  FOR DELETE USING (user_id = auth.uid());
