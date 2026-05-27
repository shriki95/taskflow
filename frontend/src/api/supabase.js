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
const fmtProject = (p, memberStatus = 'accepted') => ({
  projectId: p.id,
  name: p.name,
  description: p.description || '',
  color: p.color || '#7c3aed',
  owner_id: p.owner_id,
  created_at: p.created_at,
  project_type: p.project_type || 'tasks',
  memberStatus,
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
  completed_at: t.completed_at || null,
  created_by: t.created_by || null,
  created_at: t.created_at,
  updated_at: t.updated_at,
  recurrence_rule: t.recurrence_rule || null,
  completions_count: t.completions_count || 0,
  parent_task_id: t.parent_task_id || null,
  is_template: t.is_template || false,
  subtasks_total:     (t.subtasks || []).length,
  subtasks_completed: (t.subtasks || []).filter((s) => s.completed).length,
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
      .select('project_id, role, status, invited_by, projects(*)')
      .eq('user_id', user.id);
    if (error) wrap(error);

    // Fetch inviter names for pending invitations
    const inviterIds = [...new Set((data || [])
      .filter((m) => m.status === 'pending' && m.invited_by)
      .map((m) => m.invited_by))];
    let inviterMap = {};
    if (inviterIds.length) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, name').in('id', inviterIds);
      (profiles || []).forEach((p) => { inviterMap[p.id] = p.name; });
    }

    const projects = (data || [])
      .map((m) => m.projects ? {
        ...fmtProject(m.projects, m.status || 'accepted'),
        invitedByName: m.invited_by ? (inviterMap[m.invited_by] || null) : null,
      } : null)
      .filter(Boolean);
    return { data: { projects } };
  },

  create: async ({ name, description = '', color = '#7c3aed', project_type = 'tasks' }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) wrap(new Error('Not authenticated'));
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description, color, owner_id: user.id, project_type })
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
      .select('user_id, role, status')
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
      status: m.status || 'accepted',
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

  removeMember: async (projectId, userId) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) wrap(error);
    return { data: { message: 'Member removed' } };
  },

  invite: async (projectId, userId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId, user_id: userId, role: 'member', status: 'pending', invited_by: user.id,
    });
    if (error) wrap(error);
    return { data: { message: 'Invited' } };
  },

  acceptInvite: async (projectId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('project_members')
      .update({ status: 'accepted' })
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    if (error) wrap(error);
    return { data: { message: 'Accepted' } };
  },

  declineInvite: async (projectId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    if (error) wrap(error);
    return { data: { message: 'Declined' } };
  },

  duplicate: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) wrap(new Error('Not authenticated'));
    const { data: src, error: srcErr } = await supabase.from('projects').select('*').eq('id', id).single();
    if (srcErr) wrap(srcErr);
    const { data: newProject, error: projErr } = await supabase
      .from('projects')
      .insert({ name: src.name + ' (copy)', description: src.description, color: src.color, owner_id: user.id })
      .select().single();
    if (projErr) wrap(projErr);
    await supabase.from('project_members').insert({ project_id: newProject.id, user_id: user.id, role: 'owner' });
    const { data: tasks } = await supabase.from('tasks').select('*').eq('project_id', id);
    if (tasks && tasks.length) {
      const newTasks = tasks.map(({ id: _id, created_at: _ca, updated_at: _ua, ...t }) => ({
        ...t, project_id: newProject.id, created_by: user.id,
      }));
      await supabase.from('tasks').insert(newTasks);
    }
    return { data: fmtProject(newProject) };
  },
};

// ══════════════════════════════════════════════════════════════
// TASKS API
// ══════════════════════════════════════════════════════════════
export const tasksApi = {
  list: async (projectId) => {
    const { data, error } = await supabase
      .from('tasks').select('*, subtasks(id, completed)')
      .eq('project_id', projectId)
      .order('position', { ascending: true }).order('created_at', { ascending: true });
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
    if (fields.status !== undefined) {
      updates.status = fields.status;
      updates.completed_at = fields.status === 'done' ? new Date().toISOString() : null;
    }
    if (fields.priority !== undefined)    updates.priority = fields.priority;
    if (fields.due_date !== undefined)    updates.due_date = fields.due_date;
    if (fields.assignee_id !== undefined) updates.assignee_id = fields.assignee_id;
    if (fields.group_id !== undefined)         updates.group_id = fields.group_id;
    if (fields.duration_minutes !== undefined) updates.duration_minutes = fields.duration_minutes;
    if (fields.span_days !== undefined)         updates.span_days = fields.span_days;
    if (fields.position !== undefined)          updates.position = fields.position;
    if (fields.recurrence_rule !== undefined)   updates.recurrence_rule = fields.recurrence_rule;
    if (fields.is_template !== undefined)       updates.is_template = fields.is_template;
    if (fields.parent_task_id !== undefined)    updates.parent_task_id = fields.parent_task_id;

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

  // Create individual occurrence instances for a recurring template.
  // dates: array of ISO date strings (YYYY-MM-DD).
  createInstances: async (projectId, templateTask, dates) => {
    if (!dates.length) return { data: { tasks: [] } };
    const rows = dates.map((d) => ({
      project_id: projectId,
      title: templateTask.title,
      description: templateTask.description || '',
      status: 'todo',
      priority: templateTask.priority || 'medium',
      due_date: d,
      assignee_id: templateTask.assignee_id || null,
      group_id: templateTask.group_id || null,
      duration_minutes: templateTask.duration_minutes || null,
      created_by: templateTask.created_by || null,
      parent_task_id: templateTask.taskId,
      is_template: false,
    }));
    const { data, error } = await supabase.from('tasks').insert(rows).select('*');
    if (error) wrap(error);

    // Copy master task's subtasks to every new instance
    const { data: masterSubtasks } = await supabase
      .from('subtasks').select('*').eq('task_id', templateTask.taskId).order('position').order('created_at');
    const subtaskCount = (masterSubtasks || []).length;
    if (subtaskCount && data?.length) {
      const subtaskRows = data.flatMap((inst) =>
        masterSubtasks.map((s) => ({ task_id: inst.id, title: s.title, completed: false, position: s.position ?? 0 }))
      );
      const { error: subErr } = await supabase.from('subtasks').insert(subtaskRows);
      if (subErr) wrap(subErr);
    }

    return {
      data: {
        tasks: (data || []).map((t) => ({
          ...fmtTask({ ...t, subtasks: [] }),
          subtasks_total: subtaskCount,
          subtasks_completed: 0,
        })),
      },
    };
  },

  // Delete all future instances of a recurring series (from fromDate onwards).
  deleteInstancesFrom: async (parentTaskId, fromDate) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', parentTaskId)
      .gte('due_date', fromDate);
    if (error) wrap(error);
  },

  // Delete ALL instances of a recurring series.
  deleteAllInstances: async (parentTaskId) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('parent_task_id', parentTaskId);
    if (error) wrap(error);
  },

  // Returns the number of instances remaining for a parent task.
  countInstances: async (parentTaskId) => {
    const { count, error } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('parent_task_id', parentTaskId);
    if (error) wrap(error);
    return count ?? 0;
  },

  // Update all future instances of a series from fromDate onwards (excludes status/date fields).
  updateInstancesFrom: async (parentTaskId, fromDate, fields) => {
    const updates = {};
    if (fields.title !== undefined)            updates.title = fields.title;
    if (fields.description !== undefined)      updates.description = fields.description;
    if (fields.priority !== undefined)         updates.priority = fields.priority;
    if (fields.assignee_id !== undefined)      updates.assignee_id = fields.assignee_id;
    if (fields.group_id !== undefined)         updates.group_id = fields.group_id;
    if (fields.duration_minutes !== undefined) updates.duration_minutes = fields.duration_minutes;
    if (!Object.keys(updates).length) return;
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('parent_task_id', parentTaskId)
      .gte('due_date', fromDate);
    if (error) wrap(error);
  },

  duplicate: async (projectId, taskId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: orig, error: getErr } = await supabase
      .from('tasks').select('*').eq('id', taskId).single();
    if (getErr) wrap(getErr);
    // Fetch subtasks via direct query (more reliable than join under RLS)
    const { data: origSubtasks } = await supabase
      .from('subtasks').select('*').eq('task_id', taskId).order('position').order('created_at');
    const { data: copy, error: insErr } = await supabase
      .from('tasks')
      .insert({
        project_id: orig.project_id,
        title: orig.title + ' (copy)',
        description: orig.description,
        status: 'todo',
        priority: orig.priority,
        due_date: orig.due_date,
        assignee_id: orig.assignee_id,
        group_id: orig.group_id,
        duration_minutes: orig.duration_minutes,
        span_days: orig.span_days,
        position: (orig.position ?? 0) + 1,
        created_by: user.id,
      })
      .select().single();
    if (insErr) wrap(insErr);
    const subtasks = origSubtasks || [];
    if (subtasks.length) {
      const { error: subErr } = await supabase.from('subtasks').insert(
        subtasks.map((s) => ({ task_id: copy.id, title: s.title, completed: false, position: s.position ?? 0 }))
      );
      if (subErr) wrap(subErr);
    }
    const { data: final } = await supabase
      .from('tasks').select('*, subtasks(id, completed)').eq('id', copy.id).single();
    return { data: fmtTask(final || { ...copy, subtasks: subtasks.map((_, i) => ({ id: `tmp_${i}`, completed: false })) }) };
  },

  reorder: async (projectId, orderedIds) => {
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('tasks').update({ position: idx }).eq('id', id).eq('project_id', projectId)
      )
    );
    return { data: { message: 'Reordered' } };
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
// TASK COMPLETIONS API  (for recurring tasks)
// ══════════════════════════════════════════════════════════════
export const taskCompletionsApi = {
  list: async (taskId) => {
    const { data, error } = await supabase
      .from('task_completions')
      .select('id, completed_at, completed_by, note')
      .eq('task_id', taskId)
      .order('completed_at', { ascending: false });
    if (error) wrap(error);
    return { data: { completions: (data || []).map((c) => ({
      completionId: c.id,
      completed_at: c.completed_at,
      completed_by: c.completed_by,
      note: c.note || '',
    })) } };
  },

  create: async (taskId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('task_completions')
      .insert({ task_id: taskId, completed_by: user.id })
      .select().single();
    if (error) wrap(error);
    return { data: { completionId: data.id, completed_at: data.completed_at } };
  },

  delete: async (completionId) => {
    const { error } = await supabase.from('task_completions').delete().eq('id', completionId);
    if (error) wrap(error);
    return { data: { message: 'Completion deleted' } };
  },
};

// ══════════════════════════════════════════════════════════════
// USERS API
// ══════════════════════════════════════════════════════════════
export const usersApi = {
  list: async () => {
    const { data: { user: me } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('profiles').select('id, name, avatar_color');
    if (error) wrap(error);
    const users = (data || [])
      .filter((p) => p.id !== me?.id)
      .map((p) => ({
        userId: p.id,
        name: p.name,
        email: '',
        avatar_color: p.avatar_color || '#7c3aed',
      }));
    return { data: { users } };
  },
};

// ══════════════════════════════════════════════════════════════
// SOCIAL POSTS API
// ══════════════════════════════════════════════════════════════
export const socialPostsApi = {
  list: async (projectId) => {
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) wrap(error);
    return { data: { posts: data || [] } };
  },

  create: async (projectId, post) => {
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        project_id: projectId,
        url: post.url,
        platform: post.platform,
        author: post.author || null,
        author_avatar: post.author_avatar || null,
        thumbnail_url: post.thumbnail_url || null,
        caption: post.caption || null,
        likes: post.likes || 0,
        comments: post.comments || 0,
        views: post.views || 0,
        shares: post.shares || 0,
        saves: post.saves || 0,
        posted_at: post.posted_at || null,
        notes: post.notes || null,
      })
      .select().single();
    if (error) wrap(error);
    return data;
  },

  update: async (projectId, postId, fields) => {
    const allowed = ['author', 'author_avatar', 'thumbnail_url', 'caption', 'likes', 'comments', 'views', 'shares', 'saves', 'notes'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach((k) => { if (fields[k] !== undefined) updates[k] = fields[k]; });
    const { error } = await supabase.from('social_posts').update(updates).eq('id', postId).eq('project_id', projectId);
    if (error) console.error('social_posts update error:', error);
  },

  delete: async (projectId, postId) => {
    const { error } = await supabase.from('social_posts').delete().eq('id', postId);
    if (error) wrap(error);
  },
};
