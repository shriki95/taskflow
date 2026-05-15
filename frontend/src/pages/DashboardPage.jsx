import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, X, AlertCircle } from 'lucide-react';
import { projectsApi } from '../api/supabase';
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
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={2}
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition resize-none"
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-app-border text-slate-400 hover:text-slate-200 py-2.5 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition font-semibold"
            >
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-app-card border border-app-border rounded-xl p-5 cursor-pointer hover:border-slate-600 transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: project.color + '22', border: `1px solid ${project.color}44` }}
        >
          <FolderKanban size={18} style={{ color: project.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 truncate group-hover:text-violet-300 transition">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-slate-500 truncate mt-0.5">{project.description}</p>
          )}
        </div>
      </div>
      <div
        className="h-1 rounded-full w-full mt-2 opacity-60"
        style={{ backgroundColor: project.color }}
      />
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    projectsApi
      .list()
      .then(({ data }) => setProjects(data.projects))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (project) => {
    setProjects((prev) => [...prev, project]);
    setShowCreate(false);
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">My Projects</h1>
            <p className="text-slate-500 text-sm mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <Plus size={18} />
            New project
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
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
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-lg transition"
            >
              <Plus size={16} />
              Create first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.projectId}
                project={p}
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
