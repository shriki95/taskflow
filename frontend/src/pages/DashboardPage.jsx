import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, X, AlertCircle, CheckCircle2, Clock, Circle, MoreHorizontal, Check } from 'lucide-react';
import { projectsApi, tasksApi } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

const PROJECT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#db2777', '#0891b2', '#4f46e5',
];

function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await projectsApi.create({ name: name.trim(), description, color });
      onCreate(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-app-card border border-app-border rounded-2xl p-6 w-full max-w-md z-10"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">New project</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <AlertCircle size={14} className="text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Project name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus type="text" required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome project"
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?" rows={2}
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-app-card ring-white scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-app-border text-slate-400 hover:text-slate-200 py-2.5 rounded-lg transition font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition font-semibold">
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ProjectCard({ project, stats, onClick, onSettings }) {
  const { total, done, inProgress } = stats || { total: 0, done: 0, inProgress: 0 };
  const todo  = total - done - inProgress;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const pctSize = total >= 20 ? 'text-2xl' : total >= 8 ? 'text-3xl' : 'text-4xl';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={onClick}
      className="bg-app-card border border-app-border rounded-2xl p-5 cursor-pointer hover:border-slate-600 transition-all group flex flex-col gap-4 overflow-hidden relative"
      style={{ borderTop: `3px solid ${project.color}` }}
    >
      {/* Settings button */}
      <button
        onClick={(e) => { e.stopPropagation(); onSettings(project); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-app-bg transition"
      >
        <MoreHorizontal size={15} />
      </button>

      {/* Top: icon + name */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: project.color + '22', border: `1px solid ${project.color}44` }}
        >
          <FolderKanban size={16} style={{ color: project.color }} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-slate-100 truncate group-hover:text-white transition leading-tight">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {total > 0 ? (
        <>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs text-slate-500">{done} of {total} tasks</span>
              </div>
              <div className="h-1.5 rounded-full bg-app-bg overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: project.color }} />
              </div>
            </div>
            <span className={`font-bold leading-none flex-shrink-0 ${pctSize}`} style={{ color: project.color }}>
              {pct}<span className="text-sm font-semibold opacity-60">%</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {done > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} /> {done} done
              </span>
            )}
            {inProgress > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                <Clock size={10} /> {inProgress} active
              </span>
            )}
            {todo > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full">
                <Circle size={10} /> {todo} to do
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-600 italic">No tasks yet</p>
      )}
    </motion.div>
  );
}

function PendingProjectCard({ project, onAccept, onDecline, accepting }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative rounded-2xl overflow-hidden border border-amber-500/30"
      style={{ borderTop: `3px solid ${project.color}` }}
    >
      {/* Blurred background */}
      <div className="bg-app-card p-5 blur-sm select-none pointer-events-none">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: project.color + '22', border: `1px solid ${project.color}44` }}>
            <FolderKanban size={16} style={{ color: project.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-app-bg mb-4">
          <div className="h-full rounded-full w-1/3" style={{ backgroundColor: project.color }} />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-app-bg/70 flex flex-col items-center justify-center gap-3 px-4">
        <div className="text-center">
          <p className="text-xs text-amber-400 font-semibold mb-0.5">
            {project.invitedByName ? `${project.invitedByName} invited you` : "You've been invited"}
          </p>
          <p className="text-sm font-semibold text-slate-200">{project.name}</p>
        </div>
        <div className="flex gap-2 w-full">
          <button
            onClick={() => onDecline(project.projectId)}
            disabled={accepting === project.projectId}
            className="flex-1 py-2 text-xs font-medium text-slate-400 border border-app-border rounded-lg hover:bg-app-card hover:text-slate-200 transition"
          >
            Decline
          </button>
          <button
            onClick={() => onAccept(project.projectId)}
            disabled={accepting === project.projectId}
            className="flex-1 py-2 text-xs font-semibold text-white rounded-lg transition flex items-center justify-center gap-1"
            style={{ backgroundColor: project.color }}
          >
            {accepting === project.projectId
              ? <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
              : <><Check size={12} /> Accept</>
            }
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects]       = useState([]);
  const [statsMap, setStatsMap]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [settingsProject, setSettingsProject] = useState(null);
  const [accepting, setAccepting]     = useState(null);

  const loadStats = async (list) => {
    const results = await Promise.all(
      list
        .filter((p) => p.memberStatus === 'accepted')
        .map((p) => tasksApi.list(p.projectId)
          .then(({ data }) => ({ id: p.projectId, tasks: data.tasks }))
          .catch(() => ({ id: p.projectId, tasks: [] })))
    );
    const map = {};
    results.forEach(({ id, tasks }) => {
      map[id] = {
        total:      tasks.length,
        done:       tasks.filter((t) => t.status === 'done').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      };
    });
    return map;
  };

  useEffect(() => {
    projectsApi.list().then(async ({ data }) => {
      const list = data.projects;
      setProjects(list);
      const map = await loadStats(list);
      setStatsMap(map);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = (project) => {
    const next = [...projects, { ...project, memberStatus: 'accepted' }];
    setProjects(next);
    setStatsMap((prev) => ({ ...prev, [project.projectId]: { total: 0, done: 0, inProgress: 0 } }));
    setShowCreate(false);
  };

  const handleProjectUpdate = (updated) => {
    setProjects((prev) => prev.map((p) => p.projectId === updated.projectId ? { ...p, ...updated } : p));
  };

  const handleProjectDelete = (projectId) => {
    setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
  };

  const handleDuplicate = async (newProject) => {
    const withStatus = { ...newProject, memberStatus: 'accepted' };
    setProjects((prev) => [...prev, withStatus]);
    const { data } = await tasksApi.list(newProject.projectId).catch(() => ({ data: { tasks: [] } }));
    setStatsMap((prev) => ({
      ...prev,
      [newProject.projectId]: {
        total: data.tasks.length,
        done: data.tasks.filter((t) => t.status === 'done').length,
        inProgress: data.tasks.filter((t) => t.status === 'in_progress').length,
      },
    }));
  };

  const handleAccept = async (projectId) => {
    setAccepting(projectId);
    try {
      await projectsApi.acceptInvite(projectId);
      setProjects((prev) => prev.map((p) => p.projectId === projectId ? { ...p, memberStatus: 'accepted' } : p));
      // Load stats for this project
      const { data } = await tasksApi.list(projectId).catch(() => ({ data: { tasks: [] } }));
      setStatsMap((prev) => ({
        ...prev,
        [projectId]: {
          total: data.tasks.length,
          done: data.tasks.filter((t) => t.status === 'done').length,
          inProgress: data.tasks.filter((t) => t.status === 'in_progress').length,
        },
      }));
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = async (projectId) => {
    await projectsApi.declineInvite(projectId);
    setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
  };

  const pending  = projects.filter((p) => p.memberStatus === 'pending');
  const accepted = projects.filter((p) => p.memberStatus === 'accepted');

  return (
    <Layout>
      <div className="p-4 sm:p-8">

        {/* Pending invitations */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending invitations</span>
                <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  {pending.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {pending.map((p) => (
                  <PendingProjectCard
                    key={p.projectId}
                    project={p}
                    accepting={accepting}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">My Projects</h1>
            <p className="text-slate-500 text-sm mt-1">
              {accepted.length} project{accepted.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <Plus size={18} />
            New project
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
          </div>
        ) : accepted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-app-card border border-app-border rounded-2xl flex items-center justify-center mb-4">
              <FolderKanban size={28} className="text-slate-600" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-2">No projects yet</h3>
            <p className="text-slate-600 text-sm mb-6 max-w-xs">
              Create your first project to start organizing tasks with your team.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg transition"
            >
              <Plus size={16} /> Create first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {accepted.map((p) => (
              <ProjectCard
                key={p.projectId}
                project={p}
                stats={statsMap[p.projectId]}
                onClick={() => navigate(`/projects/${p.projectId}`)}
                onSettings={setSettingsProject}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
        {settingsProject && user && (
          <ProjectSettingsModal
            project={settingsProject}
            currentUserId={user.userId}
            onClose={() => setSettingsProject(null)}
            onUpdate={handleProjectUpdate}
            onDelete={handleProjectDelete}
            onDuplicate={handleDuplicate}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
