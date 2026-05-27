import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  X, Trash2, Copy, CheckSquare, Square, Send, ChevronDown, Flag, Calendar,
  User, AlignLeft, Plus, Check, Layers, Clock, CheckCircle2, Circle,
  RotateCcw, AlertCircle, GripVertical, RefreshCw,
} from 'lucide-react';
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tasksApi, subtasksApi, commentsApi } from '../api/supabase';
import { RECURRENCE_OPTIONS, generateOccurrenceDates } from '../utils/recurrence';
import Avatar from './Avatar';
import { isRTL, formatDuration } from '../utils/text';

const STATUSES = [
  { value: 'todo',        label: 'To Do',       dot: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress',  dot: 'bg-blue-400' },
  { value: 'done',        label: 'Done',          dot: 'bg-emerald-400' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'text-blue-400'   },
  { value: 'medium', label: 'Medium', color: 'text-amber-400'  },
  { value: 'high',   label: 'High',   color: 'text-red-400'    },
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
    <div className="flex items-start gap-2 py-1.5">
      <span className="flex items-center gap-1.5 w-20 flex-shrink-0 pt-0.5">
        <span className="text-slate-600 flex-shrink-0">{icon}</span>
        <span className="text-xs text-slate-500 truncate">{label}</span>
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SubtaskItem({ subtask, onToggle, onDelete, onEdit, dragHandleProps }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(subtask.title);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== subtask.title) onEdit(subtask.subtaskId, trimmed);
    else setDraft(subtask.title);
  };

  return (
    <div className="flex items-center gap-1.5 group py-1.5 px-1 rounded-lg hover:bg-app-card/60 transition">
      <button
        {...dragHandleProps}
        className="flex-shrink-0 text-slate-700 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none p-0.5"
      >
        <GripVertical size={13} />
      </button>
      <button onClick={() => onToggle(subtask)} className="flex-shrink-0 transition">
        {subtask.completed
          ? <CheckSquare size={15} className="text-brand-accent" />
          : <Square size={15} className="text-slate-600 hover:text-slate-400" />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setEditing(false); setDraft(subtask.title); }
          }}
          className="flex-1 bg-app-bg border border-brand-accent rounded px-2 py-0.5 text-sm text-slate-200 focus:outline-none"
        />
      ) : (
        <span
          dir={isRTL(subtask.title) ? 'rtl' : 'ltr'}
          onClick={() => setEditing(true)}
          className={`text-sm flex-1 cursor-text select-none ${subtask.completed ? 'line-through text-slate-600' : 'text-slate-300 hover:text-slate-100'}`}
        >
          {subtask.title}
        </span>
      )}
      <button
        onClick={() => onDelete(subtask.subtaskId)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-slate-600 hover:text-red-400 transition p-0.5"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function SortableSubtask({ subtask, onToggle, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: subtask.subtaskId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <SubtaskItem
        subtask={subtask}
        onToggle={onToggle}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function TaskDetail({ task, projectId, members, groups = [], onClose, onUpdate, onDelete, onDuplicate, onRecurrenceSet }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const [title, setTitle]           = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription]  = useState(task.description || '');
  const [editingDesc, setEditingDesc]   = useState(false);
  const [saving, setSaving]             = useState(false);

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
    subtasksApi.list(projectId, task.taskId).then(({ data }) => setSubtasks(data.subtasks));
    commentsApi.list(projectId, task.taskId).then(({ data }) => setComments(data.comments));
  }, [task.taskId, projectId]);

  const notifySubtaskCounts = (nextSubtasks) => {
    onUpdate({
      ...task,
      subtasks_total: nextSubtasks.length,
      subtasks_completed: nextSubtasks.filter((s) => s.completed).length,
    });
  };

  const updateField = async (fields) => {
    setSaving(true);
    try {
      const { data } = await tasksApi.update(projectId, task.taskId, fields);
      onUpdate({
        ...data,
        subtasks_total: subtasks.length,
        subtasks_completed: subtasks.filter((s) => s.completed).length,
      });
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

  const subtaskSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      const { data } = await subtasksApi.create(projectId, task.taskId, {
        title: newSubtask.trim(),
        position: subtasks.length,
      });
      const next = [...subtasks, data];
      setSubtasks(next);
      setNewSubtask('');
      notifySubtaskCounts(next);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleEditSubtask = async (subtaskId, title) => {
    setSubtasks((prev) => prev.map((s) => s.subtaskId === subtaskId ? { ...s, title } : s));
    await subtasksApi.update(projectId, task.taskId, subtaskId, { title });
  };

  const handleSubtaskDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = subtasks.findIndex((s) => s.subtaskId === active.id);
    const newIdx = subtasks.findIndex((s) => s.subtaskId === over.id);
    const reordered = arrayMove(subtasks, oldIdx, newIdx);
    setSubtasks(reordered);
    await subtasksApi.reorder(projectId, task.taskId, reordered.map((s) => s.subtaskId));
  };

  const handleToggleSubtask = async (subtask) => {
    const updated = { completed: !subtask.completed };
    const nextSubtasks = subtasks.map((s) => s.subtaskId === subtask.subtaskId ? { ...s, ...updated } : s);
    setSubtasks(nextSubtasks);
    notifySubtaskCounts(nextSubtasks);
    await subtasksApi.update(projectId, task.taskId, subtask.subtaskId, updated);
    // Auto-complete task when all subtasks are done
    if (updated.completed && nextSubtasks.every((s) => s.completed) && task.status !== 'done') {
      await updateField({ status: 'done' });
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    const next = subtasks.filter((s) => s.subtaskId !== subtaskId);
    setSubtasks(next);
    notifySubtaskCounts(next);
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

  const handleDuplicate = async () => {
    if (!onDuplicate) return;
    const { data } = await tasksApi.duplicate(projectId, task.taskId);
    onDuplicate(data);
    onClose();
  };

  const handleRecurrenceChange = async (freq) => {
    setSaving(true);
    try {
      if (!freq) {
        await tasksApi.deleteAllInstances(task.taskId);
        const { data } = await tasksApi.update(projectId, task.taskId, { recurrence_rule: null, is_template: false });
        onUpdate({ ...data, subtasks_total: subtasks.length, subtasks_completed: subtasks.filter((s) => s.completed).length });
      } else {
        await tasksApi.update(projectId, task.taskId, { recurrence_rule: { freq }, is_template: true });
        await tasksApi.deleteAllInstances(task.taskId);
        const startDate = task.due_date || new Date().toISOString().split('T')[0];
        const dates = generateOccurrenceDates(startDate, freq, 90).map((d) => d.toISOString().split('T')[0]);
        const { data: { tasks: instances } } = await tasksApi.createInstances(projectId, { ...task, recurrence_rule: { freq } }, dates);
        onRecurrenceSet?.(task.taskId, instances);
      }
    } finally {
      setSaving(false);
    }
  };

  const isDone                = task.status === 'done';
  const isInstance            = !!task.parent_task_id;
  const completedSubtasks     = subtasks.filter((s) => s.completed).length;
  const pendingSubtasks       = subtasks.length - completedSubtasks;
  const canMarkDone           = subtasks.length === 0 || pendingSubtasks === 0;
  const assignee              = members.find((m) => m.userId === task.assignee_id);

  return (
    <motion.div
      initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
      animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
      exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className={
        isMobile
          ? 'fixed inset-0 z-40 bg-app-sidebar flex flex-col overflow-hidden'
          : 'w-[420px] flex-shrink-0 bg-app-sidebar border-l border-app-border flex flex-col overflow-hidden'
      }
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
          {onDuplicate && (
            <button onClick={handleDuplicate} className="text-slate-600 hover:text-brand-accent transition p-1.5 rounded-lg hover:bg-brand-accent/10" title="Duplicate task">
              <Copy size={15} />
            </button>
          )}
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
        <div className="flex items-center gap-2">
          {isInstance && (
            <span className="flex items-center gap-1 text-xs text-brand-accent/70 bg-brand-accent/8 border border-brand-accent/20 px-2 py-0.5 rounded-full">
              <RefreshCw size={10} />Recurring
            </span>
          )}
          {isDone ? (
            <button
              onClick={() => updateField({ status: 'todo' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-slate-700/40 border border-slate-600/40 text-slate-400
                hover:bg-app-card hover:border-slate-500 hover:text-slate-300 transition"
            >
              <CheckCircle2 size={13} className="text-slate-500" />
              Completed
              <RotateCcw size={11} className="opacity-40 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => canMarkDone && updateField({ status: 'done' })}
              disabled={!canMarkDone}
              title={!canMarkDone ? `${pendingSubtasks} subtask${pendingSubtasks > 1 ? 's' : ''} remaining` : ''}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition
                ${canMarkDone
                  ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400/90 hover:bg-emerald-500/15'
                  : 'bg-app-bg border-app-border text-slate-600 cursor-not-allowed'
                }`}
            >
              {canMarkDone
                ? <><CheckCircle2 size={13} />Mark as Done</>
                : <><AlertCircle size={12} className="text-amber-500/60" />{pendingSubtasks} remaining</>
              }
            </button>
          )}
        </div>

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
            <div className="flex flex-col gap-1.5">
              <input
                type="date"
                value={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={(e) => updateField({ due_date: e.target.value || null })}
                className="bg-app-bg border border-app-border rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-accent transition [color-scheme:dark]"
              />
              <input
                type="date"
                title="End date"
                value={task.due_date && task.span_days
                  ? format(addDays(new Date(task.due_date), task.span_days - 1), 'yyyy-MM-dd')
                  : ''}
                min={task.due_date ? format(addDays(new Date(task.due_date), 1), 'yyyy-MM-dd') : ''}
                disabled={!task.due_date}
                onChange={(e) => {
                  if (!e.target.value || !task.due_date) { updateField({ span_days: null }); return; }
                  const diff = differenceInDays(new Date(e.target.value), new Date(task.due_date));
                  updateField({ span_days: diff >= 1 ? diff + 1 : null });
                }}
                className="bg-app-bg border border-app-border rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-accent transition [color-scheme:dark] disabled:opacity-35 disabled:cursor-not-allowed"
              />
            </div>
          </FieldRow>

          <FieldRow icon={<Clock size={12} />} label="Est. time">
            <select
              value={task.duration_minutes ?? ''}
              onChange={(e) => updateField({ duration_minutes: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-app-bg border border-app-border rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-accent transition"
            >
              {TIME_PRESETS.map((p) => (
                <option key={p.value ?? 'none'} value={p.value ?? ''}>{p.label}</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow icon={<RefreshCw size={12} />} label="Repeat">
            <FieldSelect
              value={task.recurrence_rule?.freq || ''}
              options={RECURRENCE_OPTIONS.map((o) => ({ value: o.value ?? '', label: o.label }))}
              onChange={handleRecurrenceChange}
              renderValue={(v) => {
                const opt = RECURRENCE_OPTIONS.find((o) => (o.value ?? '') === v);
                return (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={11} className={v ? 'text-brand-accent' : 'text-slate-500'} />
                    {opt?.label || 'Does not repeat'}
                  </span>
                );
              }}
              renderOption={(opt) => (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={11} className={opt.value ? 'text-brand-accent' : 'text-slate-500'} />
                  {opt.label}
                </span>
              )}
            />
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
              <DndContext sensors={subtaskSensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                <SortableContext items={subtasks.map((s) => s.subtaskId)} strategy={verticalListSortingStrategy}>
                  <div className="mb-2 -mx-1">
                    {subtasks.map((s) => (
                      <SortableSubtask
                        key={s.subtaskId}
                        subtask={s}
                        onToggle={handleToggleSubtask}
                        onDelete={handleDeleteSubtask}
                        onEdit={handleEditSubtask}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
