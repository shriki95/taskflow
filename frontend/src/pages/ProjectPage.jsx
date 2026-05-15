import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Plus, ArrowLeft, Users } from 'lucide-react';
import { projectsApi, tasksApi } from '../api/supabase';
import Layout from '../components/Layout';
import KanbanBoard from '../components/KanbanBoard';
import ListView from '../components/ListView';
import TaskDetail from '../components/TaskDetail';
import CreateTaskModal from '../components/CreateTaskModal';

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createStatus, setCreateStatus] = useState('todo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, tasksRes, membersRes] = await Promise.all([
          projectsApi.get(projectId),
          tasksApi.list(projectId),
          projectsApi.members(projectId),
        ]);
        setProject(projRes.data);
        setTasks(tasksRes.data.tasks);
        setMembers(membersRes.data.members);
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, navigate]);

  const handleStatusChange = useCallback(
    async (taskId, newStatus) => {
      const original = tasks.find((t) => t.taskId === taskId)?.status;
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, status: newStatus } : t))
      );
      try {
        await tasksApi.update(projectId, taskId, { status: newStatus });
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.taskId === taskId ? { ...t, status: original } : t))
        );
      }
    },
    [tasks, projectId]
  );

  const handleTaskUpdate = useCallback((updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === updatedTask.taskId ? updatedTask : t))
    );
    setSelectedTask((prev) =>
      prev?.taskId === updatedTask.taskId ? updatedTask : prev
    );
  }, []);

  const handleTaskDelete = useCallback((taskId) => {
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    setSelectedTask(null);
  }, []);

  const handleTaskCreate = useCallback((newTask) => {
    setTasks((prev) => [...prev, newTask]);
    setShowCreateTask(false);
  }, []);

  const openCreateTask = (status = 'todo') => {
    setCreateStatus(status);
    setShowCreateTask(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-500 hover:text-slate-300 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project?.color }}
              />
              <h1 className="text-lg font-semibold text-slate-100">{project?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-app-bg border border-app-border rounded-lg p-1">
              <button
                onClick={() => setView('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  view === 'board'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid size={14} />
                Board
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  view === 'list'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List size={14} />
                List
              </button>
            </div>

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

            <button
              onClick={() => openCreateTask('todo')}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-3.5 py-2 rounded-lg transition text-sm"
            >
              <Plus size={16} />
              Add task
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            {view === 'board' ? (
              <KanbanBoard
                tasks={tasks}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onAddTask={openCreateTask}
              />
            ) : (
              <ListView
                tasks={tasks}
                members={members}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onAddTask={() => openCreateTask('todo')}
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
            members={members}
            onClose={() => setShowCreateTask(false)}
            onCreate={handleTaskCreate}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
