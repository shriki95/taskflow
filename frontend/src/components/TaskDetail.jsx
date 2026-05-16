import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  X, Trash2, CheckSquare, Square, Send, ChevronDown, Flag, Calendar,
  User, AlignLeft, Plus, Check, Layers, Clock, CheckCircle2, Circle,
  RotateCcw, AlertCircle,
} from 'lucide-react';
import { tasksApi, subtasksApi, commentsApi } from '../api/supabase';
import Avatar from './Avatar';
import { isRTL, formatDuration } from '../utils/text';

const STATUSES = [
  { value: 'todo',        label: 'To Do',       dot: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress',  dot: 'bg-blue-400' },
  { value: 'done',        label: 'Done',          dot: 'bg-emerald-400' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'text-emerald-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400'   },
  { value: 'high',   label: 'High',   color: 'text-red-400'     },
];

const TIME_PRESETS = [
  { value: null, label: '— no estimate' },
  { value: 5,    label: '5 min'   },
  { value: 15,   label: '15 min'  },
  { value: 30,   label: '30 min'  },
  { value: 60,   label: '1 hour'  },
  { value: 90,   label: '1.5 hours' },
  { value: 120,  label: '2 hours' },
  { value: 180,  label: '3 hours' },
  { value: 240,  label: '4 hours' },
  { value: 360,  label: '6 hours' },
  { value: 480,  label: '8 hours' },
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-app-bg border border-app-border hover:border-slate-500 text-sm text-slate-300 transition"
      >
        {renderValue(value)}
        <ChevronDown size={12} className="text-slate-500 ml-0.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-app-card border border-app-border rounded-xl shadow-xl z-20 min-w-[150px] overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-app-bg transition ${opt.value === value ? 'text-brand-accent' : 'text-slate-300'}`}
            >
              {renderOption(opt)}
              {opt.value === value && <Check size={12} className="ml-auto text-brand-accent flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ icon, label, children }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="flex items-center gap-1.5 w-24 flex-shrink-0">
        <span className="text-slate-600">{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </span>
      {children}
    </div>
  );
}

function SubtaskItem({ subtask, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-2.5 group py-1.5 px-2 rounded-lg hover:bg-app-card/60 transition">
      <button onClick={() => onToggle(subtask)} className="flex-shrink-0 transition">
        {subtask.completed
          ? <CheckSquare size={15} className="text-brand-accent" />
          : <Square size={15} className="text-slate-600 hover:text-slate-400" />}
      </button>
      <span dir={isRTL(subtask.title) ? 'rtl' : 'ltr'} className={`text-sm flex-1 ${subtask.completed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.subtaskId)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function TaskDetail({ task, projectId, members, groups = [], onClose, onUpdate, onDelete }) {
  const [title, setTitle]           = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription]  = useState(task.description || '');
  const [editingDesc, setEditingDesc]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [spanInput, setSpanInput]       = useState(task.span_days ? String(task.span_days) : '');

  const [subtasks, setSubtasks]         = useState([]);
  const [newSubtask, setNewSubtask]     = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const titleRef = useRef();
  const descRef  = useRef();

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setSpanInput(task.span_days ? String(task.span_days) : '');
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
    if (title.trim() && title.trim() !== task.title) updateField({ title: title.trim() });
    else setTitle(task.title);
  };

  const handleDescBlur = () => {
    setEditingDesc(false);
    if (description !== (task.description || '')) updateField({ description });
  };

  const handleSpanBlur = () => {
    const v = spanInput === '' ? null : Math.max(2, Math.min(365, parseInt(spanInput) || 2));
    if (v !== (task.span_days ?? null)) updateField({ span_days: v });
    setSpanInput(v ? String(v) : '');
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
    const nextSubtasks = subtasks.map((s) => s.subtaskId === subtask.subtaskId ? { ...s, ...updated } : s);
    setSubtasks(nextSubtasks);
    await subtasksApi.update(projectId, task.taskId, subtask.subtaskId, updated);
    // Auto-complete task when all subtasks are done
    if (updated.completed && nextSubtasks.every((s) => s.completed) && task.status !== 'done') {
      await updateField({ status: 'done' });
    }
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

  const isDone                = task.status === 'done';
  const completedSubtasks     = subtasks.filter((s) => s.completed).length;
  const pendingSubtasks       = subtasks.length - completedSubtasks;
  const canMarkDone           = subtasks.length === 0 || pendingSubtasks === 0;
  const assignee              = members.find((m) => m.userId === task.assignee_id);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="w-[420px] flex-shrink-0 bg-app-sidebar border-l border-app-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-app-border">
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-slate-500 animate-pulse">Saving…</span>}
          {!saving && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isDone
                ? 'bg-emerald-500/15 text-emerald-400'
                : task.status === 'in_progress'
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'bg-slate-700/60 text-slate-400'
            }`}>
              {STATUSES.find((s) => s.value === task.status)?.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleDelete} className="text-slate-600 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10" title="Delete task">
            <Trash2 size={15} />
          </button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition p-1.5 rounded-lg hover:bg-app-card">
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

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

        {/* Done / Reopen button */}
        {isDone ? (
          <button
            onClick={() => updateField({ status: 'todo' })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-emerald-500/10 border border-emerald-500/25 text-emerald-400
              hover:bg-app-card hover:border-slate-600 hover:text-slate-300 transition text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            Completed — click to reopen
            <RotateCcw size={13} className="opacity-50 ml-auto" />
          </button>
        ) : (
          <button
            onClick={() => canMarkDone && updateField({ status: 'done' })}
            disabled={!canMarkDone}
            title={!canMarkDone ? `${pendingSubtasks} subtask${pendingSubtasks > 1 ? 's' : ''} remaining` : ''}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              border text-sm font-medium transition
              ${canMarkDone
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-app-bg border-app-border text-slate-600 cursor-not-allowed'
              }`}
          >
            {canMarkDone
              ? <><CheckCircle2 size={16} />Mark as Done</>
              : <><AlertCircle size={15} className="text-amber-500/70" />{pendingSubtasks} subtask{pendingSubtasks > 1 ? 's' : ''} remaining</>
            }
          </button>
        )}

        {/* Meta fields */}
        <div className="bg-app-card/40 border border-app-border rounded-xl px-3 py-2 space-y-0.5">
          <FieldRow icon={<Circle size={12} />} label="Status">
            <FieldSelect
              value={task.status}
              options={STATUSES}
              onChange={(v) => updateField({ status: v })}
              renderValue={(v) => {
                const s = STATUSES.find((x) => x.value === v);
                return <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${s?.dot}`} />{s?.label}</span>;
              }}
              renderOption={(opt) => <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${opt.dot}`} />{opt.label}</span>}
            />
          </FieldRow>

          <FieldRow icon={<Flag size={12} />} label="Priority">
            <FieldSelect
              value={task.priority}
              options={PRIORITIES}
              onChange={(v) => updateField({ priority: v })}
              renderValue={(v) => {
                const p = PRIORITIES.find((x) => x.value === v);
                return <span className={`flex items-center gap-1.5 ${p?.color}`}><Flag size={12} />{p?.label}</span>;
              }}
              renderOption={(opt) => <span className={`flex items-center gap-1.5 ${opt.color}`}><Flag size={12} />{opt.label}</span>}
            />
          </FieldRow>

          <FieldRow icon={<User size={12} />} label="Assignee">
            <FieldSelect
              value={task.assignee_id || ''}
              options={[{ value: '', label: 'Unassigned' }, ...members.map((m) => ({ value: m.userId, label: m.name, color: m.avatar_color }))]}
              onChange={(v) => updateField({ assignee_id: v || null })}
              renderValue={(v) => {
                if (!v) return <span className="text-slate-500 flex items-center gap-1.5"><User size={13} />Unassigned</span>;
                const m = members.find((x) => x.userId === v);
                return m ? <span className="flex items-center gap-1.5"><Avatar name={m.name} color={m.avatar_color} size="xs" />{m.name}</span> : null;
              }}
              renderOption={(opt) => opt.value
                ? <span className="flex items-center gap-2"><Avatar name={opt.label} color={opt.color} size="xs" />{opt.label}</span>
                : <span className="text-slate-500">{opt.label}</span>
              }
            />
          </FieldRow>

          {groups.length > 0 && (
            <FieldRow icon={<Layers size={12} />} label="Section">
              <FieldSelect
                value={task.group_id || ''}
                options={[{ value: '', label: 'No section' }, ...groups.map((g) => ({ value: g.groupId, label: g.name }))]}
                onChange={(v) => updateField({ group_id: v || null })}
                renderValue={(v) => {
                  if (!v) return <span className="flex items-center gap-1.5 text-slate-500"><Layers size={12} />No section</span>;
                  const g = groups.find((x) => x.groupId === v);
                  return <span className="flex items-center gap-1.5"><Layers size={12} />{g?.name || 'Unknown'}</span>;
                }}
                renderOption={(opt) => <span className="flex items-center gap-2"><Layers size={12} className="text-slate-500" />{opt.label}</span>}
              />
            </FieldRow>
          )}

          <FieldRow icon={<Calendar size={12} />} label="Due date">
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={(e) => updateField({ due_date: e.target.value || null })}
                className="bg-app-bg border border-app-border rounded-lg px-2.5 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-accent transition [color-scheme:dark]"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={2}
                  max={365}
                  value={spanInput}
                  onChange={(e) => setSpanInput(e.target.value)}
                  onBlur={handleSpanBlur}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  placeholder="1"
                  title="Number of days this task spans"
                  className="w-14 bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-accent transition text-center"
                />
                <span className="text-xs text-slate-500">days</span>
                {task.span_days && (
                  <button
                    onClick={() => { setSpanInput(''); updateField({ span_days: null }); }}
                    className="text-slate-600 hover:text-red-400 transition ml-0.5"
                    title="Reset to single day"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </FieldRow>

          <FieldRow icon={<Clock size={12} />} label="Est. time">
            <select
              value={task.duration_minutes ?? ''}
              onChange={(e) => updateField({ duration_minutes: e.target.value ? Number(e.target.value) : null })}
              className="bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-accent transition"
            >
              {TIME_PRESETS.map((p) => (
                <option key={p.value ?? 'none'} value={p.value ?? ''}>{p.label}</option>
              ))}
            </select>
          </FieldRow>
        </div>

        {/* Description */}
        <div className="bg-app-card/40 border border-app-border rounded-xl px-4 py-3">
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
              className="text-sm text-slate-400 cursor-text hover:text-slate-300 min-h-[36px] rounded hover:bg-app-card/50 transition leading-relaxed"
            >
              {description || <span className="text-slate-600" dir="ltr">Add a description…</span>}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="bg-app-card/40 border border-app-border rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckSquare size={13} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Subtasks
              </span>
              {subtasks.length > 0 && (
                <span className="text-xs text-slate-500 font-medium">
                  {completedSubtasks}/{subtasks.length}
                </span>
              )}
            </div>
            {subtasks.length > 0 && completedSubtasks === subtasks.length && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Check size={11} />All done
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <>
              <div className="h-1 bg-app-border rounded-full mb-2 overflow-hidden">
                <div
                  className="h-full bg-brand-accent rounded-full transition-all duration-300"
                  style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                />
              </div>
              <div className="mb-2 -mx-2">
                {subtasks.map((s) => (
                  <SubtaskItem key={s.subtaskId} subtask={s} onToggle={handleToggleSubtask} onDelete={handleDeleteSubtask} />
                ))}
              </div>
            </>
          )}

          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add subtask…"
              className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition"
            />
            <button
              type="submit"
              disabled={addingSubtask || !newSubtask.trim()}
              className="bg-app-bg border border-app-border hover:border-brand-accent text-slate-400 hover:text-brand-accent px-3 rounded-lg transition disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>

        {/* Comments */}
        <div className="bg-app-card/40 border border-app-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Comments
            </span>
            {comments.length > 0 && (
              <span className="text-xs text-slate-500">{comments.length}</span>
            )}
          </div>

          {comments.length > 0 && (
            <div className="space-y-4 mb-4">
              {comments.map((c) => (
                <div key={c.commentId} className="flex gap-2.5">
                  <Avatar name={c.author_name} color={c.author_color} size="sm" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-300">{c.author_name}</span>
                      <span className="text-xs text-slate-600">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <p dir={isRTL(c.text) ? 'rtl' : 'ltr'} className="text-sm text-slate-400 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

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
