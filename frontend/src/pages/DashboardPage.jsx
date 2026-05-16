import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, X, AlertCircle, CheckCircle2, Clock, Circle } from 'lucide-react';
import { projectsApi, tasksApi } from '../api/supabase';
import Layout from '../components/Layout';

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
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
              autoFocus
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome project"
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={2}
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-app-card ring-white scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-app-border text-slate-400 hover:text-slate-200 py-2.5 rounded-lg transition font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition font-semibold"
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ProjectCard({ project, stats, onClick }) {
  const { total, done, inProgress } = stats || { total: 0, done: 0, inProgress: 0 };
  const todo       = total - done - inProgress;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

  // Font size for the percentage number scales with task volume
  const pctSize = total >= 20 ? 'text-2xl' : total >= 8 ? 'text-3xl' : 'text-4xl';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={onClick}
      className="bg-app-card border border-app-border rounded-2xl p-5 cursor-pointer hover:border-slate-600 transition-all group flex flex-col gap-4 overflow-hidden relative"
      style={{ borderTop: `3px solid ${project.color}` }}
    >
      {/* Top: icon + name */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: project.color + '22', border: `1px solid ${project.color}44` }}
        >
          <FolderKanban size={16} style={{ color: project.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 truncate group-hover:text-white transition leading-tight">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {total > 0 ? (
        <>
          {/* Progress bar + percentage */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs text-slate-500">{done} of {total} tasks</span>
              </div>
              <div className="h-1.5 rounded-full bg-app-bg overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: project.color }}
                />
              </div>
            </div>
            <span
              className={`font-bold leading-none flex-shrink-0 ${pctSize}`}
              style={{ color: project.color }}
            >
              {pct}<span className="text-sm font-semibold opacity-60">%</span>
            </span>
          </div>

          {/* Status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {done > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} />
                {done} done
              </span>
            )}
            {inProgress > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                <Clock size={10} />
                {inProgress} active
              </span>
            )}
            {todo > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full">
                <Circle size={10} />
                {todo} to do
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    projectsApi.list().then(async ({ data }) => {
      const list = data.projects;
      setProjects(list);

      // Fetch tasks for all projects in parallel
      const results = await Promise.all(
        list.map((p) => tasksApi.list(p.projectId).then(({ data }) => ({ id: p.projectId, tasks: data.tasks })).catch(() => ({ id: p.projectId, tasks: [] })))
      );
      const map = {};
      results.forEach(({ id, tasks }) => {
        map[id] = {
          total:      tasks.length,
          done:       tasks.filter((t) => t.status === 'done').length,
          inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        };
      });
      setStatsMap(map);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = (project) => {
    setProjects((prev) => [...prev, project]);
    setStatsMap((prev) => ({ ...prev, [project.projectId]: { total: 0, done: 0, inProgress: 0 } }));
    setShowCreate(false);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">My Projects</h1>
            <p className="text-slate-500 text-sm mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
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
        ) : projects.length === 0 ? (
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
              <Plus size={16} />
              Create first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.map((p) => (
              <ProjectCard
                key={p.projectId}
                project={p}
                stats={statsMap[p.projectId]}
                onClick={() => navigate(`/projects/${p.projectId}`)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
