import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { tasksApi } from '../api/supabase';
import Avatar from './Avatar';

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function CreateTaskModal({
  projectId,
  initialStatus = 'todo',
  initialGroupId = null,
  members = [],
  groups = [],
  onClose,
  onCreate,
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: initialStatus,
    priority: 'medium',
    due_date: '',
    assignee_id: '',
    group_id: initialGroupId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        due_date: form.due_date || null,
        assignee_id: form.assignee_id || null,
        group_id: form.group_id || null,
      };
      const { data } = await tasksApi.create(projectId, payload);
      onCreate(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-app-card border border-app-border rounded-2xl p-6 w-full max-w-lg z-10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">New task</h2>
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Task name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Add more details…"
              rows={2}
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition resize-none"
            />
          </div>

          {/* Row: Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:border-brand-accent transition"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:border-brand-accent transition"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section (only shown when groups exist) */}
          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Section</label>
              <select
                value={form.group_id}
                onChange={(e) => set('group_id', e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:border-brand-accent transition"
              >
                <option value="">No section</option>
                {groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Row: Due Date + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Due date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:border-brand-accent transition [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Assignee</label>
              <select
                value={form.assignee_id}
                onChange={(e) => set('assignee_id', e.target.value)}
                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:border-brand-accent transition"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
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
              disabled={loading || !form.title.trim()}
              className="flex-1 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition font-semibold"
            >
              {loading ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
