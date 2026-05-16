import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Color picker (same logic as Python backend) ───────────────
const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#db2777', '#0891b2', '#4f46e5',
];
const pickColor = (seed) =>
  AVATAR_COLORS[Math.abs([...seed].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

// ── Data formatters ───────────────────────────────────────────
const fmtProject = (p) => ({
  projectId: p.id,
  name: p.name,
  description: p.description || '',
  color: p.color || '#7c3aed',
  owner_id: p.owner_id,
  created_at: p.created_at,
});

const fmtTask = (t) => ({
  taskId: t.id,
  projectId: t.project_id,
  title: t.title,
  description: t.description || '',
  status: t.status || 'todo',
  priority: t.priority || 'medium',
  due_date: t.due_date || null,
  assignee_id: t.assignee_id || null,
  group_id: t.group_id || null,
  duration_minutes: t.duration_minutes || null,
  span_days: t.span_days || null,
  created_by: t.created_by || null,
  created_at: t.created_at,
  updated_at: t.updated_at,
});

const fmtGroup = (g) => ({
  groupId: g.id,
  projectId: g.project_id,
  name: g.name,
  position: g.position || 0,
  created_at: g.created_at,
});

const fmtSubtask = (s) => ({
  subtaskId: s.id,
  taskId: s.task_id,
  title: s.title,
  completed: s.completed,
  position: s.position ?? 0,
  created_at: s.created_at,
});

const fmtMember = (m, profile) => ({
  userId: m.user_id,
  name: profile?.name || 'Unknown',
  email: profile?.email || '',
  avatar_color: profile?.avatar_color || '#7c3aed',
  role: m.role,
});

// ── Error wrapper ─────────────────────────────────────────────
const wrap = (error) => {
  throw { response: { data: { error: error.message }, status: 400 } };
};

// ══════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════
export const authApi = {
  signup: async ({ name, email, password }) => {
    const avatar_color = pickColor(email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, avatar_color } },
    });
    if (error) wrap(error);
    // Profile is auto-created by DB trigger
    const user = { userId: data.user.id, email, name, avatar_color };
    return { data: { token: null, user } };
  },

  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) wrap(error);
    const { data: profile } = await supabase
      .from('profiles').select('name, avatar_color').eq('id', data.user.id).single();
    const user = {
      userId: data.user.id,
      email: data.user.email,
      name: profile?.name || '',
      avatar_color: profile?.avatar_color || '#7c3aed',
    };
    return { data: { token: null, user } };
  },

  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw { response: { status: 401, data: { error: 'Unauthorized' } } };
    const { data: profile } = await supabase
      .from('profiles').select('name, avatar_color').eq('id', user.id).single();
    return {
      data: {
        userId: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || '',
        avatar_color: profile?.avatar_color || '#7c3aed',
      },
    };
  },
};

// ══════════════════════════════════════════════════════════════
// PROJECTS API
// ══════════════════════════════════════════════════════════════
export const projectsApi = {
  list: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: { projects: [] } };
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .eq('user_id', user.id);
    if (error) wrap(error);
    const projects = (data || []).map((m) => m.projects ? fmtProject(m.projects) : null).filter(Boolean);
    return { data: { projects } };
  },

  create: async ({ name, description = '', color = '#7c3aed' }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) wrap(new Error('Not authenticated'));
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description, color, owner_id: user.id })
      .select().single();
    if (error) wrap(error);
    if (!data) wrap(new Error('Failed to read project after create'));
    const { error: memberErr } = await supabase.from('project_members').insert({
      project_id: data.id, user_id: user.id, role: 'owner',
    });
    if (memberErr) wrap(memberErr);
    return { data: fmtProject(data) };
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('projects').select('*').eq('id', id).single();
    if (error) wrap(error);
    return { data: fmtProject(data) };
  },

  update: async (id, fields) => {
    const updates = {};
    if (fields.name !== undefined)        updates.name = fields.name;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.color !== undefined)       updates.color = fields.color;
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) wrap(error);
    return { data: { message: 'Project updated' } };
  },

  delete: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) wrap(error);
    return { data: { message: 'Project deleted' } };
  },

  members: async (projectId) => {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', projectId);
    if (error) wrap(error);
    const userIds = (data || []).map((m) => m.user_id);
    let profileMap = {};
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, name, avatar_color').in('id', userIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }
    const members = (data || []).map((m) => ({
      userId: m.user_id,
      name: profileMap[m.user_id]?.name || 'Unknown',
      email: '',
      avatar_color: profileMap[m.user_id]?.avatar_color || '#7c3aed',
      role: m.role,
    }));
    return { data: { members } };
  },

  addMember: async (projectId, { userId }) => {
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId, user_id: userId, role: 'member',
    });
    if (error) wrap(error);
    return { data: { message: 'Member added' } };
  },
};

// ══════════════════════════════════════════════════════════════
// TASKS API
// ══════════════════════════════════════════════════════════════
export const tasksApi = {
  list: async (projectId) => {
    const { data, error } = await supabase
      .from('tasks').select('*').eq('project_id', projectId);
    if (error) wrap(error);
    return { data: { tasks: (data || []).map(fmtTask) } };
  },

  create: async (projectId, fields) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: fields.title,
        description: fields.description || '',
        status: fields.status || 'todo',
        priority: fields.priority || 'medium',
        due_date: fields.due_date || null,
        assignee_id: fields.assignee_id || null,
        group_id: fields.group_id || null,
        duration_minutes: fields.duration_minutes || null,
        span_days: fields.span_days || null,
        created_by: user.id,
      })
      .select().single();
    if (error) wrap(error);
    return { data: fmtTask(data) };
  },

  get: async (projectId, taskId) => {
    const { data, error } = await supabase
      .from('tasks').select('*').eq('id', taskId).eq('project_id', projectId).single();
    if (error) wrap(error);
    return { data: fmtTask(data) };
  },

  update: async (projectId, taskId, fields) => {
    const updates = {};
    if (fields.title !== undefined)       updates.title = fields.title;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.status !== undefined)      updates.status = fields.status;
    if (fields.priority !== undefined)    updates.priority = fields.priority;
    if (fields.due_date !== undefined)    updates.due_date = fields.due_date;
    if (fields.assignee_id !== undefined) updates.assignee_id = fields.assignee_id;
    if (fields.group_id !== undefined)         updates.group_id = fields.group_id;
    if (fields.duration_minutes !== undefined) updates.duration_minutes = fields.duration_minutes;
    if (fields.span_days !== undefined)        updates.span_days = fields.span_days;

    const { data, error } = await supabase
      .from('tasks').update(updates).eq('id', taskId).select().single();
    if (error) wrap(error);
    return { data: fmtTask(data) };
  },

  delete: async (projectId, taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) wrap(error);
    return { data: { message: 'Task deleted' } };
  },
};

// ══════════════════════════════════════════════════════════════
// SUBTASKS API
// ══════════════════════════════════════════════════════════════
export const subtasksApi = {
  list: async (projectId, taskId) => {
    const { data, error } = await supabase
      .from('subtasks').select('*').eq('task_id', taskId).order('position').order('created_at');
    if (error) wrap(error);
    return { data: { subtasks: (data || []).map(fmtSubtask) } };
  },

  create: async (projectId, taskId, { title, position }) => {
    const { data, error } = await supabase
      .from('subtasks').insert({ task_id: taskId, title, position: position ?? 0 }).select().single();
    if (error) wrap(error);
    return { data: fmtSubtask(data) };
  },

  update: async (projectId, taskId, subtaskId, fields) => {
    const updates = {};
    if (fields.title !== undefined)     updates.title = fields.title;
    if (fields.completed !== undefined) updates.completed = fields.completed;
    if (fields.position !== undefined)  updates.position = fields.position;
    const { error } = await supabase.from('subtasks').update(updates).eq('id', subtaskId);
    if (error) wrap(error);
    return { data: { message: 'Subtask updated' } };
  },

  reorder: async (projectId, taskId, orderedIds) => {
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('subtasks').update({ position: idx }).eq('id', id)
      )
    );
    return { data: { message: 'Reordered' } };
  },

  delete: async (projectId, taskId, subtaskId) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
    if (error) wrap(error);
    return { data: { message: 'Subtask deleted' } };
  },
};

// ══════════════════════════════════════════════════════════════
// COMMENTS API
// ══════════════════════════════════════════════════════════════
export const commentsApi = {
  list: async (projectId, taskId) => {
    const { data, error } = await supabase
      .from('comments').select('*').eq('task_id', taskId).order('created_at');
    if (error) wrap(error);
    const authorIds = [...new Set((data || []).map((c) => c.author_id))];
    let profileMap = {};
    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, name, avatar_color').in('id', authorIds);
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    }
    const comments = (data || []).map((c) => ({
      commentId: c.id,
      taskId: c.task_id,
      text: c.text,
      author_id: c.author_id,
      author_name: profileMap[c.author_id]?.name || 'Unknown',
      author_color: profileMap[c.author_id]?.avatar_color || '#7c3aed',
      created_at: c.created_at,
    }));
    return { data: { comments } };
  },

  create: async (projectId, taskId, { text }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('comments').insert({ task_id: taskId, text, author_id: user.id }).select().single();
    if (error) wrap(error);
    const { data: profile } = await supabase
      .from('profiles').select('name, avatar_color').eq('id', user.id).single();
    return {
      data: {
        commentId: data.id,
        taskId: data.task_id,
        text: data.text,
        author_id: data.author_id,
        author_name: profile?.name || 'Unknown',
        author_color: profile?.avatar_color || '#7c3aed',
        created_at: data.created_at,
      },
    };
  },
};

// ══════════════════════════════════════════════════════════════
// TASK GROUPS API
// ══════════════════════════════════════════════════════════════
export const taskGroupsApi = {
  list: async (projectId) => {
    const { data, error } = await supabase
      .from('task_groups').select('*').eq('project_id', projectId).order('position');
    if (error) wrap(error);
    return { data: { groups: (data || []).map(fmtGroup) } };
  },

  create: async (projectId, { name, position = 0 }) => {
    const { data, error } = await supabase
      .from('task_groups').insert({ project_id: projectId, name, position }).select().single();
    if (error) wrap(error);
    return { data: fmtGroup(data) };
  },

  update: async (groupId, fields) => {
    const updates = {};
    if (fields.name !== undefined)     updates.name = fields.name;
    if (fields.position !== undefined) updates.position = fields.position;
    const { error } = await supabase.from('task_groups').update(updates).eq('id', groupId);
    if (error) wrap(error);
    return { data: { message: 'Group updated' } };
  },

  delete: async (groupId) => {
    const { error } = await supabase.from('task_groups').delete().eq('id', groupId);
    if (error) wrap(error);
    return { data: { message: 'Group deleted' } };
  },
};

// ══════════════════════════════════════════════════════════════
// USERS API
// ══════════════════════════════════════════════════════════════
export const usersApi = {
  list: async () => {
    const { data, error } = await supabase.from('profiles').select('id, name, avatar_color');
    if (error) wrap(error);
    const users = (data || []).map((p) => ({
      userId: p.id,
      name: p.name,
      email: '',
      avatar_color: p.avatar_color || '#7c3aed',
    }));
    return { data: { users } };
  },
};
