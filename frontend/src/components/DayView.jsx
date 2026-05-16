import { useState } from 'react';
import { format, addDays, subDays, isSameDay, isToday, addDays as addDaysUtil } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Calendar, Flag } from 'lucide-react';
import Avatar from './Avatar';
import { isRTL, formatDuration } from '../utils/text';

const PRIORITY_COLOR = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-blue-400' };
const PRIORITY_BORDER = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-blue-500' };
const PRIORITY_BG = { high: 'bg-red-500/5', medium: 'bg-amber-500/5', low: 'bg-blue-500/5' };

function blockHeight(duration_minutes) {
  if (!duration_minutes) return 64;
  const hours = duration_minutes / 60;
  return Math.max(64, Math.min(Math.round(hours * 72), 360));
}

function getTaskSpan(task) {
  if (!task.due_date) return [];
  const start = new Date(task.due_date);
  if (!task.span_days || task.span_days <= 1) return [start];
  return Array.from({ length: task.span_days }, (_, i) => addDays(start, i));
}

function DayTaskBlock({ task, members, onClick, onStatusChange }) {
  const isDone = task.status === 'done';
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const height = blockHeight(task.duration_minutes);
  const durLabel = formatDuration(task.duration_minutes);
  const pb = PRIORITY_BORDER[task.priority] || 'border-l-slate-500';
  const bg = PRIORITY_BG[task.priority] || '';

  return (
    <div
      onClick={onClick}
      style={{ minHeight: `${height}px` }}
      className={`flex flex-col gap-1 px-4 py-3 cursor-pointer rounded-xl border border-app-border
        border-l-4 ${pb} ${bg} hover:bg-app-card/70 transition
        ${isDone ? 'opacity-60' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
          className="flex-shrink-0 mt-0.5 focus:outline-none hover:opacity-70 transition-opacity"
        >
          {isDone
            ? <CheckCircle2 size={16} className="text-emerald-400" />
            : <Circle size={16} className="text-slate-500 hover:text-slate-300 transition-colors" />
          }
        </button>
        <span
          dir={isRTL(task.title) ? 'rtl' : 'ltr'}
          className={`text-sm font-semibold leading-snug break-words min-w-0 flex-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}
        >
          {task.title}
        </span>
        <Flag size={12} className={`flex-shrink-0 mt-0.5 ${PRIORITY_COLOR[task.priority] || 'text-slate-600'}`} />
      </div>

      {/* Duration + assignee */}
      {(durLabel || assignee) && (
        <div className="flex items-center gap-3 pl-7 mt-auto pt-1">
          {durLabel && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} />
              {durLabel}
            </span>
          )}
          {assignee && <Avatar name={assignee.name} color={assignee.avatar_color} size="xs" />}
        </div>
      )}
    </div>
  );
}

export default function DayView({ tasks, members, onTaskClick, onStatusChange, initialDate }) {
  const [current, setCurrent] = useState(initialDate || new Date());

  const dayTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const span = getTaskSpan(t);
    return span.some((d) => isSameDay(d, current));
  });

  const today = isToday(current);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-100">
            {format(current, 'EEEE, MMMM d')}
          </h2>
          {today && (
            <span className="text-xs bg-brand-accent text-white px-2 py-0.5 rounded-full font-medium">
              Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent((d) => subDays(d, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition border border-app-border"
          >
            Today
          </button>
          <button
            onClick={() => setCurrent((d) => addDays(d, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-auto">
        {dayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-600">
            <Calendar size={36} className="opacity-30" />
            <p className="text-sm">No tasks due on this day</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dayTasks.map((task) => (
              <DayTaskBlock
                key={task.taskId}
                task={task}
                members={members}
                onClick={() => onTaskClick(task)}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
