import { useState, useRef, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, MoreHorizontal, Trash2, ArrowRight } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Avatar from './Avatar';
import { isRTL, formatDuration } from '../utils/text';

const PRIORITY = {
  high:   { label: 'High',   cls: 'text-red-400 bg-red-400/10 border-red-400/20',     border: 'border-l-red-500'   },
  medium: { label: 'Medium', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20', border: 'border-l-amber-500' },
  low:    { label: 'Low',    cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',   border: 'border-l-blue-500'  },
};

export default function TaskCard({
  task,
  members = [],
  onClick,
  onStatusChange,
  onDueDateChange,
  dragging = false,
  groups = [],
  onDelete,
  onMoveToGroup,
  density = 'comfortable',
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef();
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isDone = task.status === 'done';
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;
  const otherGroups = groups.filter((g) => g.groupId !== task.group_id);
  const showMenu = !dragging && (onDelete || (onMoveToGroup && otherGroups.length > 0));

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (!menuContainerRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const handleToggleDone = (e) => {
    e.stopPropagation();
    if (onStatusChange) onStatusChange(task.taskId, isDone ? 'todo' : 'done');
  };

  const handleDateClick = (e) => {
    e.stopPropagation();
    if (onDueDateChange) setEditingDate(true);
  };

  const handleDateChange = (e) => {
    e.stopPropagation();
    if (onDueDateChange) onDueDateChange(task.taskId, e.target.value || null);
    setEditingDate(false);
  };

  const cardCls  = density === 'dense'      ? 'p-1.5 mb-0.5 rounded'
                 : density === 'compact'    ? 'p-2 mb-1 rounded-md'
                 : 'p-3.5 mb-2 rounded-xl';
  const titleGap = density === 'comfortable' ? 'mb-3' : density === 'compact' ? 'mb-1.5' : 'mb-0';
  const titleSz  = density === 'comfortable' ? 'text-sm' : 'text-xs';
  const iconSz   = density === 'comfortable' ? 16 : 14;

  return (
    <div
      onClick={onClick}
      className={`bg-app-card border border-l-2 cursor-pointer transition-all group select-none
        ${cardCls}
        ${priority.border}
        ${isDone ? 'opacity-60' : ''}
        ${dragging
          ? 'border-brand-accent shadow-lg shadow-brand-accent/20 rotate-1'
          : 'border-app-border hover:border-slate-600 hover:shadow-md'
        }`}
    >
      {/* Title row with done toggle */}
      <div className={`flex items-start gap-2 ${titleGap}`}>
        <button
          onClick={handleToggleDone}
          className="flex-shrink-0 mt-0.5 focus:outline-none"
          title={isDone ? 'Mark as to-do' : 'Mark as done'}
        >
          {isDone
            ? <CheckCircle2 size={iconSz} className="text-emerald-400" />
            : <Circle size={iconSz} className="text-slate-600 hover:text-slate-400 transition-colors" />
          }
        </button>
        <p
          dir={isRTL(task.title) ? 'rtl' : 'ltr'}
          className={`${titleSz} font-medium leading-snug group-hover:text-slate-100 flex-1
            ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {task.title}
        </p>

        {/* ⋯ menu */}
        {showMenu && (
          <div
            ref={menuContainerRef}
            className="relative flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-app-sidebar transition"
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-6 z-50 bg-app-card border border-app-border rounded-lg shadow-xl min-w-[160px] py-1">
                {onMoveToGroup && otherGroups.length > 0 && (
                  <>
                    <div className="px-3 pt-1.5 pb-1 text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                      Move to
                    </div>
                    {otherGroups.map((g) => (
                      <button
                        key={g.groupId}
                        onClick={() => { onMoveToGroup(task.taskId, g.groupId); setMenuOpen(false); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-app-bg transition"
                      >
                        <ArrowRight size={11} className="flex-shrink-0" />
                        {g.name}
                      </button>
                    ))}
                    {onDelete && <div className="my-1 border-t border-app-border" />}
                  </>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.taskId); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition"
                  >
                    <Trash2 size={11} />
                    Delete task
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtask progress */}
      {task.subtasks_total > 0 && (() => {
        const pct = Math.round((task.subtasks_completed / task.subtasks_total) * 100);
        if (density === 'comfortable') return (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">{task.subtasks_completed}/{task.subtasks_total} subtasks</span>
              <span className="text-[10px] text-slate-500">{pct}%</span>
            </div>
            <div className="h-1 bg-app-border rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
        if (density === 'compact') return (
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="flex-1 h-0.5 bg-app-border rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[9px] text-slate-500 flex-shrink-0">{task.subtasks_completed}/{task.subtasks_total} · {pct}%</span>
          </div>
        );
        // dense
        return (
          <div className="mt-1 flex items-center gap-1">
            <div className="flex-1 h-0.5 bg-app-border rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[9px] text-slate-500 flex-shrink-0">{pct}%</span>
          </div>
        );
      })()}

      {/* Completed date — comfortable only */}
      {density === 'comfortable' && isDone && task.completed_at && (
        <div className="flex items-center gap-1 mb-2.5">
          <CheckCircle2 size={10} className="text-emerald-500/70 flex-shrink-0" />
          <span className="text-[10px] text-emerald-600/80">
            Done {format(new Date(task.completed_at), 'MMM d, yyyy')}
          </span>
        </div>
      )}

      {/* Footer — hidden on dense */}
      {density !== 'dense' && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${priority.cls}`}>
              {density === 'compact' ? priority.label[0] : priority.label}
            </span>
            {density === 'comfortable' && formatDuration(task.duration_minutes) && (
              <span className="flex items-center gap-0.5 text-xs text-slate-500 bg-app-bg border border-app-border px-1.5 py-0.5 rounded-full">
                <Clock size={9} />
                {formatDuration(task.duration_minutes)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {editingDate ? (
              <input
                autoFocus
                type="date"
                defaultValue={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={handleDateChange}
                onBlur={() => setEditingDate(false)}
                onClick={(e) => e.stopPropagation()}
                className="bg-app-bg border border-brand-accent rounded px-1.5 py-0.5 text-xs text-slate-300 [color-scheme:dark] w-30 focus:outline-none"
              />
            ) : (
              <button
                onClick={handleDateClick}
                className={`flex items-center gap-1 text-xs rounded px-1 py-0.5 transition
                  ${isOverdue ? 'text-red-400 hover:bg-red-400/10' : dueDate ? 'text-slate-500 hover:text-slate-300 hover:bg-app-sidebar' : 'text-slate-700 hover:text-slate-500 hover:bg-app-sidebar'}`}
                title={onDueDateChange ? 'Click to change due date' : undefined}
              >
                <Calendar size={11} />
                {dueDate ? format(dueDate, 'MMM d') : <span className="text-slate-600">Add date</span>}
              </button>
            )}
            {density === 'comfortable' && assignee && (
              <Avatar name={assignee.name} color={assignee.avatar_color} size="xs" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
