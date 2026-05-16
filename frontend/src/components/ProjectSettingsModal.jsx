import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Trash2, Search, Check, UserPlus } from 'lucide-react';
import { projectsApi, usersApi } from '../api/supabase';
import Avatar from './Avatar';

const PROJECT_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706',
  '#dc2626', '#db2777', '#0891b2', '#4f46e5',
];

export default function ProjectSettingsModal({ project, currentUserId, onClose, onUpdate, onDelete, onDuplicate }) {
  const isOwner = project.owner_id === currentUserId;

  const [name, setName]               = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [color, setColor]             = useState(project.color);
  const [saving, setSaving]           = useState(false);

  const [members, setMembers]   = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch]     = useState('');
  const [inviting, setInviting] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteAnswer, setDeleteAnswer]   = useState('');
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    projectsApi.members(project.projectId).then(({ data }) => setMembers(data.members));
    if (isOwner) usersApi.list().then(({ data }) => setAllUsers(data.users));
  }, [project.projectId, isOwner]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await projectsApi.update(project.projectId, { name: name.trim(), description, color });
      onUpdate({ ...project, name: name.trim(), description, color });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const { data } = await projectsApi.duplicate(project.projectId);
      onDuplicate(data);
      onClose();
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(project.projectId);
      onDelete(project.projectId);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const handleInvite = async (userId) => {
    setInviting(userId);
    try {
      await projectsApi.invite(project.projectId, userId);
      const { data } = await projectsApi.members(project.projectId);
      setMembers(data.members);
      setSearch('');
    } finally {
      setInviting(null);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const filteredUsers = allUsers.filter(
    (u) => !memberIds.has(u.userId) && u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-app-card border border-app-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md z-10 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
            <h2 className="text-base font-semibold text-slate-100">Project Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

          {/* ── General ─────────────────────────────── */}
          {isOwner && (
            <section>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">General</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-accent transition resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-app-card ring-white scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </section>
          )}

          {/* ── Share ───────────────────────────────── */}
          {isOwner && (
            <section>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Share with</h3>

              {/* Current members */}
              {members.length > 0 && (
                <div className="space-y-1 mb-3">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2.5 py-1.5 px-1">
                      <Avatar name={m.name} color={m.avatar_color} size="sm" />
                      <span className="text-sm text-slate-300 flex-1 truncate">{m.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        m.role === 'owner'
                          ? 'text-brand-accent bg-brand-accent/10'
                          : m.status === 'pending'
                            ? 'text-amber-400 bg-amber-400/10'
                            : 'text-slate-500 bg-slate-700/40'
                      }`}>
                        {m.role === 'owner' ? 'Owner' : m.status === 'pending' ? 'Pending…' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Search users */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users to invite…"
                  className="w-full bg-app-bg border border-app-border rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition"
                />
              </div>

              {search.trim() && (
                filteredUsers.length > 0 ? (
                  <div className="bg-app-bg border border-app-border rounded-lg overflow-hidden">
                    {filteredUsers.slice(0, 5).map((u) => (
                      <div key={u.userId} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-app-card transition">
                        <Avatar name={u.name} color={u.avatar_color} size="sm" />
                        <span className="text-sm text-slate-300 flex-1 truncate">{u.name}</span>
                        <button
                          onClick={() => handleInvite(u.userId)}
                          disabled={inviting === u.userId}
                          className="flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent/80 font-medium transition flex-shrink-0"
                        >
                          {inviting === u.userId
                            ? <span className="text-slate-500">…</span>
                            : <><UserPlus size={12} /> Invite</>
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 text-center py-2">No users found</p>
                )
              )}
            </section>
          )}

          {/* ── Actions ─────────────────────────────── */}
          <section className="border-t border-app-border pt-4 space-y-1">
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-app-bg rounded-lg transition"
            >
              <Copy size={15} className="text-slate-500" />
              {duplicating ? 'Duplicating…' : 'Duplicate project'}
            </button>
            {isOwner && !confirmDelete && (
              <button
                onClick={() => { setConfirmDelete(true); setDeleteAnswer(''); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition"
              >
                <Trash2 size={15} />
                Delete project
              </button>
            )}
            {isOwner && confirmDelete && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Trash2 size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 leading-snug">
                    אתה עומד למחוק את <span className="font-semibold">"{project.name}"</span> עם כל המשימות שבתוכו. פעולה זו אינה הפיכה.
                  </p>
                </div>
                <p className="text-sm text-slate-300">
                  כדי לוודא שאתה בטוח — <span className="font-semibold text-slate-100">כמה זה 2+2?</span>
                </p>
                <input
                  autoFocus
                  type="text"
                  value={deleteAnswer}
                  onChange={(e) => setDeleteAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && deleteAnswer.trim() === '4' && handleDelete()}
                  placeholder="התשובה שלך…"
                  className="w-full bg-app-bg border border-red-500/30 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-400 transition"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteAnswer(''); }}
                    className="flex-1 py-2 text-sm text-slate-400 border border-app-border rounded-lg hover:bg-app-bg transition"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteAnswer.trim() !== '4' || deleting}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                  >
                    {deleting ? 'מוחק…' : 'מחק פרויקט'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}
