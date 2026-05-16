import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  X, Trash2, CheckSquare, Square, Send, ChevronDown, Flag, Calendar,
  User, AlignLeft, Plus, Check, Layers, Clock,
} from 'lucide-react';
import { tasksApi, subtasksApi, commentsApi } from '../api/supabase';
import Avatar from './Avatar';
import { isRTL, formatDuration, parseDuration } from '../utils/text';

const STATUSES = [
  { value: 'todo', label: 'To Do', dot: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-blue-400' },
  { value: 'done', label: 'Done', dot: 'bg-emerald-400' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-emerald-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'high', label: 'High', color: 'text-red-400' },
];

function FieldSelect({ value, options, onChange, renderOption, renderValue }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-app-bg border border-app-border hover:border-slate-600 text-sm text-slate-300 transition"
      >
        {renderValue(value)}
        <ChevronDown size={12} className="text-slate-500" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-app-card border border-app-border rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-app-bg transition ${opt.value === value ? 'text-brand-accent' : 'text-slate-300'}`}
            >
              {renderOption(opt)}
              {opt.value === value && <Check size={12} className="ml-auto text-brand-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TIME_PRESETS = [
  { value: null, label: '— no estimate' },
  { value: 5,    label: '5 min' },
  { value: 15,   label: '15 min' },
  { value: 30,   label: '30 min' },
  { value: 60,   label: '1 hour' },
  { value: 90,   label: '1.5 hours' },
  { value: 120,  label: '2 hours' },
  { value: 180,  label: '3 hours' },
  { value: 240,  label: '4 hours' },
  { value: 360,  label: '6 hours' },
  { value: 480,  label: '8 hours' },
];

const SPAN_PRESETS = [
  { value: null, label: '— single day' },
  { value: 2,    label: '2 days' },
  { value: 3,    label: '3 days' },
  { value: 5,    label: '5 days' },
  { value: 7,    label: '1 week' },
  { value: 14,   label: '2 weeks' },
];

function SubtaskItem({ subtask, projectId, taskId, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-2.5 group py-1.5">
      <button
        onClick={() => onToggle(subtask)}
        className="text-slate-500 hover:text-brand-accent transition flex-shrink-0"
      >
        {subtask.completed
          ? <CheckSquare size={16} className="text-brand-accent" />
          : <Square size={16} />
        }
      </button>
      <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.subtaskId)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function TaskDetail({ task, projectId, members, groups = [], onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(task.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const titleRef = useRef();
  const descRef = useRef();

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    subtasksApi.list(projectId, task.taskId).then(({ data }) => setSubtasks(data.subtasks));
    commentsApi.list(projectId, task.taskId).then(({ data }) => setComments(data.comments));
  }, [task.taskId, projectId]);

  const updateField = async (fields) => {
    setSaving(true);
    try {
      const { data } = await tasksApi.update(projectId, task.taskId, fields);
      onUpdate(data);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title.trim() && title.trim() !== task.title) {
      updateField({ title: title.trim() });
    } else {
      setTitle(task.title);
    }
  };

  const handleDescBlur = () => {
    setEditingDesc(false);
    if (description !== (task.description || '')) {
      updateField({ description });
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      const { data } = await subtasksApi.create(projectId, task.taskId, { title: newSubtask.trim() });
      setSubtasks((prev) => [...prev, data]);
      setNewSubtask('');
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtask) => {
    const updated = { completed: !subtask.completed };
    setSubtasks((prev) =>
      prev.map((s) => (s.subtaskId === subtask.subtaskId ? { ...s, ...updated } : s))
    );
    await subtasksApi.update(projectId, task.taskId, subtask.subtaskId, updated);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    setSubtasks((prev) => prev.filter((s) => s.subtaskId !== subtaskId));
    await subtasksApi.delete(projectId, task.taskId, subtaskId);
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      const { data } = await commentsApi.create(projectId, task.taskId, { text: commentText.trim() });
      setComments((prev) => [...prev, data]);
      setCommentText('');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await tasksApi.delete(projectId, task.taskId);
    onDelete(task.taskId);
  };

  const assignee = members.find((m) => m.userId === task.assignee_id);
  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="w-[420px] flex-shrink-0 bg-app-sidebar border-l border-app-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-slate-500 animate-pulse">Saving…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="text-slate-600 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10"
            title="Delete task"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition p-1.5 rounded-lg hover:bg-app-card"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Title */}
        {editingTitle ? (
          <textarea
            ref={titleRef}
            autoFocus
            dir={isRTL(title) ? 'rtl' : 'ltr'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleBlur(); } }}
            rows={2}
            className="w-full bg-transparent text-lg font-semibold text-slate-100 focus:outline-none resize-none leading-snug"
          />
        ) : (
          <h2
            dir={isRTL(title) ? 'rtl' : 'ltr'}
            onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 10); }}
            className="text-lg font-semibold text-slate-100 leading-snug cursor-text hover:text-white"
          >
            {title}
          </h2>
        )}

        {/* Meta fields */}
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-20 flex-shrink-0">Status</span>
            <FieldSelect
              value={task.status}
              options={STATUSES}
              onChange={(v) => updateField({ status: v })}
              renderValue={(v) => {
                const s = STATUSES.find((x) => x.value === v);
                return (
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${s?.dot}`} />
                    {s?.label}
                  </span>
                );
              }}
              renderOption={(opt) => (
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  {opt.label}
                </span>
              )}
            />
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-20 flex-shrink-0">Priority</span>
            <FieldSelect
              value={task.priority}
              options={PRIORITIES}
              onChange={(v) => updateField({ priority: v })}
              renderValue={(v) => {
                const p = PRIORITIES.find((x) => x.value === v);
                return (
                  <span className={`flex items-center gap-1.5 ${p?.color}`}>
                    <Flag size={12} />
                    {p?.label}
                  </span>
                );
              }}
              renderOption={(opt) => (
                <span className={`flex items-center gap-1.5 ${opt.color}`}>
                  <Flag size={12} />
                  {opt.label}
                </span>
              )}
            />
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-20 flex-shrink-0">Assignee</span>
            <FieldSelect
              value={task.assignee_id || ''}
              options={[{ value: '', label: 'Unassigned', color: '' }, ...members.map((m) => ({ value: m.userId, label: m.name, color: m.avatar_color }))]}
              onChange={(v) => updateField({ assignee_id: v || null })}
              renderValue={(v) => {
                if (!v) return <span className="text-slate-500 flex items-center gap-1.5"><User size={13} />Unassigned</span>;
                const m = members.find((x) => x.userId === v);
                return m ? (
                  <span className="flex items-center gap-1.5">
                    <Avatar name={m.name} color={m.avatar_color} size="xs" />
                    {m.name}
                  </span>
                ) : null;
              }}
              renderOption={(opt) => opt.value ? (
                <span className="flex items-center gap-2">
                  <Avatar name={opt.label} color={opt.color} size="xs" />
                  {opt.label}
                </span>
              ) : (
                <span className="text-slate-500">{opt.label}</span>
              )}
            />
          </div>

          {/* Section (only when groups exist) */}
          {groups.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-20 flex-shrink-0">Section</span>
              <FieldSelect
                value={task.group_id || ''}
                options={[
                  { value: '', label: 'No section' },
                  ...groups.map((g) => ({ value: g.groupId, label: g.name })),
                ]}
                onChange={(v) => updateField({ group_id: v || null })}
                renderValue={(v) => {
                  if (!v) return <span className="flex items-center gap-1.5 text-slate-500"><Layers size={12} />No section</span>;
                  const g = groups.find((x) => x.groupId === v);
                  return <span className="flex items-center gap-1.5"><Layers size={12} />{g?.name || 'Unknown'}</span>;
                }}
                renderOption={(opt) => (
                  <span className="flex items-center gap-2">
                    <Layers size={12} className="text-slate-500" />
                    {opt.label}
                  </span>
                )}
              />
            </div>
          )}

          {/* Due date + span days */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-20 flex-shrink-0">Due date</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={(e) => updateField({ due_date: e.target.value || null })}
                className="bg-app-bg border border-app-border rounded-lg px-2.5 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-accent transition [color-scheme:dark]"
              />
              <select
                value={task.span_days ?? ''}
                onChange={(e) => updateField({ span_days: e.target.value ? Number(e.target.value) : null })}
                className="bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-brand-accent transition"
                title="Calendar span"
              >
                {SPAN_PRESETS.map((p) => (
                  <option key={p.value ?? 'none'} value={p.value ?? ''}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated time */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-20 flex-shrink-0">Est. time</span>
            <select
              value={task.duration_minutes ?? ''}
              onChange={(e) => updateField({ duration_minutes: e.target.value ? Number(e.target.value) : null })}
              className="bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-brand-accent transition"
            >
              {TIME_PRESETS.map((p) => (
                <option key={p.value ?? 'none'} value={p.value ?? ''}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-app-border" />

        {/* Description */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlignLeft size={13} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</span>
          </div>
          {editingDesc ? (
            <textarea
              ref={descRef}
              autoFocus
              dir={isRTL(description) ? 'rtl' : 'ltr'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescBlur}
              rows={4}
              placeholder="Add a description…"
              className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition resize-none"
            />
          ) : (
            <div
              dir={isRTL(description) ? 'rtl' : 'ltr'}
              onClick={() => { setEditingDesc(true); setTimeout(() => descRef.current?.focus(), 10); }}
              className="text-sm text-slate-400 cursor-text hover:text-slate-300 min-h-[40px] px-1 py-0.5 rounded hover:bg-app-card/50 transition"
            >
              {description || <span className="text-slate-600" dir="ltr">Add a description…</span>}
            </div>
          )}
        </div>

        <div className="border-t border-app-border" />

        {/* Subtasks */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckSquare size={13} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subtasks {subtasks.length > 0 && `(${completedSubtasks}/${subtasks.length})`}
            </span>
          </div>

          {subtasks.length > 0 && (
            <div className="mb-2">
              {/* Progress bar */}
              <div className="h-1 bg-app-border rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-brand-accent rounded-full transition-all"
                  style={{ width: `${subtasks.length ? (completedSubtasks / subtasks.length) * 100 : 0}%` }}
                />
              </div>
              {subtasks.map((s) => (
                <SubtaskItem
                  key={s.subtaskId}
                  subtask={s}
                  projectId={projectId}
                  taskId={task.taskId}
                  onToggle={handleToggleSubtask}
                  onDelete={handleDeleteSubtask}
                />
              ))}
            </div>
          )}

          <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add subtask…"
              className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition"
            />
            <button
              type="submit"
              disabled={addingSubtask || !newSubtask.trim()}
              className="bg-app-card border border-app-border hover:border-brand-accent text-slate-400 hover:text-brand-accent px-3 rounded-lg transition disabled:opacity-40"
            >
              <Plus size={15} />
            </button>
          </form>
        </div>

        <div className="border-t border-app-border" />

        {/* Comments */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Comments {comments.length > 0 && `(${comments.length})`}
            </span>
          </div>

          <div className="space-y-4 mb-4">
            {comments.map((c) => (
              <div key={c.commentId} className="flex gap-2.5">
                <Avatar name={c.author_name} color={c.author_color} size="sm" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-300">{c.author_name}</span>
                    <span className="text-xs text-slate-600">
                      {format(new Date(c.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition"
            />
            <button
              type="submit"
              disabled={sendingComment || !commentText.trim()}
              className="bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-40 text-white px-3 rounded-lg transition"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
