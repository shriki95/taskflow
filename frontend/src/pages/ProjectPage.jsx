import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutGrid, List, CalendarDays, CalendarRange, Sun,
  Plus, ArrowLeft, Pencil, Trash2,
} from 'lucide-react';
import { projectsApi, tasksApi, taskGroupsApi } from '../api/supabase';
import Layout from '../components/Layout';
import KanbanBoard from '../components/KanbanBoard';
import ListView from '../components/ListView';
import CalendarView from '../components/CalendarView';
import WeekView from '../components/WeekView';
import DayView from '../components/DayView';
import TaskDetail from '../components/TaskDetail';
import CreateTaskModal from '../components/CreateTaskModal';
import EditProjectModal from '../components/EditProjectModal';

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createStatus, setCreateStatus] = useState('todo');
  const [createGroupId, setCreateGroupId] = useState(null);
  const [calNavDate, setCalNavDate] = useState(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, tasksRes, membersRes, groupsRes] = await Promise.all([
          projectsApi.get(projectId),
          tasksApi.list(projectId),
          projectsApi.members(projectId),
          taskGroupsApi.list(projectId),
        ]);
        setProject(projRes.data);
        setTasks(tasksRes.data.tasks);
        setMembers(membersRes.data.members);
        setGroups(groupsRes.data.groups);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleStatusChange = useCallback(
    async (taskId, newStatus) => {
      const original = tasks.find((t) => t.taskId === taskId)?.status;
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status: newStatus } : t)));
      try {
        await tasksApi.update(projectId, taskId, { status: newStatus });
      } catch {
        setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status: original } : t)));
      }
    },
    [tasks, projectId]
  );

  const handleDueDateChange = useCallback(
    async (taskId, newDate) => {
      const original = tasks.find((t) => t.taskId === taskId)?.due_date;
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, due_date: newDate || null } : t)));
      try {
        await tasksApi.update(projectId, taskId, { due_date: newDate || null });
      } catch {
        setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, due_date: original } : t)));
      }
    },
    [tasks, projectId]
  );

  const handleTaskUpdate = useCallback((updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.taskId === updatedTask.taskId ? updatedTask : t)));
    setSelectedTask((prev) => (prev?.taskId === updatedTask.taskId ? updatedTask : prev));
  }, []);

  const handleTaskDelete = useCallback((taskId) => {
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    setSelectedTask(null);
  }, []);

  const handleTaskCreate = useCallback((newTask) => {
    setTasks((prev) => [...prev, newTask]);
    setShowCreateTask(false);
  }, []);

  const handleProjectUpdate = useCallback((updatedProject) => {
    setProject(updatedProject);
    setShowEditProject(false);
  }, []);

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(projectId);
      navigate('/dashboard');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleGroupCreate = useCallback(async (name) => {
    const { data } = await taskGroupsApi.create(projectId, { name, position: groups.length });
    setGroups((prev) => [...prev, data]);
  }, [projectId, groups]);

  const handleGroupUpdate = useCallback(async (groupId, name) => {
    setGroups((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, name } : g)));
    await taskGroupsApi.update(groupId, { name });
  }, []);

  const handleGroupDelete = useCallback(async (groupId) => {
    setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
    setTasks((prev) => prev.map((t) => (t.group_id === groupId ? { ...t, group_id: null } : t)));
    await taskGroupsApi.delete(groupId);
  }, []);

  const handleColumnChange = useCallback(
    async (taskId, newGroupId) => {
      const original = tasks.find((t) => t.taskId === taskId)?.group_id ?? null;
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, group_id: newGroupId } : t)));
      try {
        await tasksApi.update(projectId, taskId, { group_id: newGroupId });
      } catch {
        setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, group_id: original } : t)));
      }
    },
    [tasks, projectId]
  );

  const handleDayClick = useCallback((date) => {
    setCalNavDate(date);
    setView((v) => (v === 'calendar' ? 'week' : 'day'));
  }, []);

  const openCreateTask = (options = {}) => {
    if (typeof options === 'string') {
      setCreateStatus(options);
      setCreateGroupId(null);
    } else {
      setCreateStatus(options.status || 'todo');
      setCreateGroupId(options.groupId || null);
    }
    setShowCreateTask(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-red-400">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="text-brand-accent hover:underline text-sm">
            Back to dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const MAIN_VIEWS = [
    { id: 'board',    icon: <LayoutGrid size={14} />,   label: 'Board' },
    { id: 'list',     icon: <List size={14} />,         label: 'List' },
    { id: 'calendar', icon: <CalendarDays size={14} />, label: 'Calendar' },
  ];

  const CALENDAR_SUBS = [
    { id: 'calendar', icon: <CalendarDays size={12} />, label: 'Month' },
    { id: 'week',     icon: <CalendarRange size={12} />, label: 'Week' },
    { id: 'day',      icon: <Sun size={12} />,           label: 'Day' },
  ];

  const isCalendarView = ['calendar', 'week', 'day'].includes(view);

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-300 transition">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color }} />
              <h1 className="text-lg font-semibold text-slate-100">{project?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Main view toggle */}
            <div className="flex bg-app-bg border border-app-border rounded-lg p-1">
              {MAIN_VIEWS.map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id === 'calendar' && !isCalendarView ? 'calendar' : id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition ${
                    (id === 'calendar' ? isCalendarView : view === id)
                      ? 'bg-brand-accent text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Calendar sub-toggle */}
            {isCalendarView && (
              <div className="flex bg-app-bg border border-app-border rounded-lg p-1">
                {CALENDAR_SUBS.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition ${
                      view === id ? 'bg-brand-accent/20 text-brand-accent' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Members */}
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m) => (
                <div
                  key={m.userId}
                  className="w-8 h-8 rounded-full border-2 border-app-bg flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: m.avatar_color }}
                  title={m.name}
                >
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>

            {/* Edit / Delete project */}
            <div className="flex items-center gap-1 border-l border-app-border pl-3">
              <button
                onClick={() => setShowEditProject(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-app-card transition"
                title="Edit project"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition"
                title="Delete project"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <button
              onClick={() => openCreateTask('todo')}
              className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-3.5 py-2 rounded-lg transition text-sm"
            >
              <Plus size={16} />
              Add task
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            {view === 'board' && (
              <KanbanBoard
                tasks={tasks}
                groups={groups}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onDueDateChange={handleDueDateChange}
                onAddTask={openCreateTask}
                onColumnChange={handleColumnChange}
                onGroupCreate={handleGroupCreate}
                onGroupUpdate={handleGroupUpdate}
                onGroupDelete={handleGroupDelete}
              />
            )}
            {view === 'list' && (
              <ListView
                tasks={tasks}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onDueDateChange={handleDueDateChange}
                onAddTask={openCreateTask}
                groups={groups}
                onGroupCreate={handleGroupCreate}
                onGroupUpdate={handleGroupUpdate}
                onGroupDelete={handleGroupDelete}
              />
            )}
            {view === 'calendar' && (
              <CalendarView
                tasks={tasks}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onDueDateChange={handleDueDateChange}
                onDayClick={handleDayClick}
              />
            )}
            {view === 'week' && (
              <WeekView
                key={calNavDate?.toISOString()}
                tasks={tasks}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onDueDateChange={handleDueDateChange}
                initialDate={calNavDate}
                onDayClick={handleDayClick}
              />
            )}
            {view === 'day' && (
              <DayView
                key={calNavDate?.toISOString()}
                tasks={tasks}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                initialDate={calNavDate}
              />
            )}
          </div>

          {/* Task Detail Panel */}
          <AnimatePresence>
            {selectedTask && (
              <TaskDetail
                task={selectedTask}
                projectId={projectId}
                members={members}
                groups={groups}
                onClose={() => setSelectedTask(null)}
                onUpdate={handleTaskUpdate}
                onDelete={handleTaskDelete}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateTask && (
          <CreateTaskModal
            projectId={projectId}
            initialStatus={createStatus}
            initialGroupId={createGroupId}
            members={members}
            groups={groups}
            onClose={() => setShowCreateTask(false)}
            onCreate={handleTaskCreate}
          />
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {showEditProject && project && (
          <EditProjectModal
            project={project}
            onClose={() => setShowEditProject(false)}
            onUpdate={handleProjectUpdate}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-app-card border border-app-border rounded-2xl p-6 w-full max-w-sm z-10"
            >
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete project?</h3>
              <p className="text-slate-400 text-sm mb-6">
                <span className="text-slate-200 font-medium">"{project?.name}"</span> and all its tasks will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="flex-1 border border-app-border text-slate-400 hover:text-slate-200 py-2.5 rounded-lg transition font-medium disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={handleDeleteProject} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2.5 rounded-lg transition font-semibold">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
