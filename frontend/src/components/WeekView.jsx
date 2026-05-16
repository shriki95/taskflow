import { useState } from 'react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, addWeeks, subWeeks, isSameMonth, addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { isRTL, formatDuration } from '../utils/text';

const PRIORITY_BAR = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
const PRIORITY_BORDER = { high: 'border-red-500/40', medium: 'border-amber-500/40', low: 'border-emerald-500/40' };
const PRIORITY_BG = { high: 'bg-red-500/5', medium: 'bg-amber-500/5', low: 'bg-emerald-500/5' };

// Returns all dates a task spans
function getTaskSpan(task) {
  if (!task.due_date) return [];
  const due = new Date(task.due_date);
  if (!task.duration_minutes || task.duration_minutes < 1440) return [due];
  const days = Math.ceil(task.duration_minutes / 1440);
  return Array.from({ length: days }, (_, i) => addDays(due, -(days - 1 - i)));
}

// Height in px for a task block based on duration
function blockHeight(duration_minutes) {
  if (!duration_minutes) return 48;
  const hours = duration_minutes / 60;
  return Math.max(48, Math.min(Math.round(hours * 56), 280));
}

function WeekTaskBlock({ task, members, onClick, onStatusChange, isFirst, isMultiDay }) {
  const isDone = task.status === 'done';
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const height = blockHeight(task.duration_minutes);
  const durLabel = formatDuration(task.duration_minutes);
  const pb = PRIORITY_BORDER[task.priority] || 'border-app-border';
  const bg = PRIORITY_BG[task.priority] || '';

  // Continuation bar for multi-day non-first days
  if (!isFirst && isMultiDay) {
    return (
      <div
        style={{ height: `${height}px` }}
        className={`w-full rounded-md mb-1 border-l-2 ${pb} ${bg} opacity-40`}
      />
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      style={{ height: `${height}px` }}
      className={`flex flex-col gap-0.5 px-1.5 py-1 rounded-md text-xs cursor-pointer
        hover:opacity-80 transition mb-1 overflow-hidden border-l-2
        ${pb} ${bg} bg-app-sidebar border border-app-border
        ${isDone ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
          className="flex-shrink-0 focus:outline-none"
        >
          {isDone
            ? <CheckCircle2 size={10} className="text-emerald-400" />
            : <Circle size={10} className="text-slate-600 hover:text-slate-400 transition-colors" />
          }
        </button>
        <span
          dir={isRTL(task.title) ? 'rtl' : 'ltr'}
          className={`truncate flex-1 font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {task.title}
        </span>
        {isMultiDay && <span className="text-slate-600 text-[9px] flex-shrink-0">→</span>}
      </div>
      {height >= 72 && (
        <div className="flex items-center gap-1 mt-auto">
          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_BAR[task.priority] || 'bg-slate-500'}`} />
          {durLabel && <span className="text-slate-500 text-[10px]">{durLabel}</span>}
          {assignee && (
            <span
              className="ml-auto w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: assignee.avatar_color }}
            >
              {assignee.name[0]?.toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeekView({ tasks, members, onTaskClick, onStatusChange, initialDate, onDayClick }) {
  const [current, setCurrent] = useState(initialDate || new Date());

  const weekStart = startOfWeek(current, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(current, { weekStartsOn: 0 });
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const taskSpans = tasks
    .filter((t) => t.due_date)
    .map((t) => ({ task: t, span: getTaskSpan(t) }));

  const tasksForDay = (day) =>
    taskSpans
      .filter(({ span }) => span.some((d) => isSameDay(d, day)))
      .map(({ task, span }) => ({
        task,
        isFirst: isSameDay(span[0], day),
        isMultiDay: span.length > 1,
      }));

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-100">
          {format(weekStart, 'MMM d')} – {format(weekEnd, isSameMonth(weekStart, weekEnd) ? 'd, yyyy' : 'MMM d, yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent((d) => subWeeks(d, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition border border-app-border"
          >
            This week
          </button>
          <button
            onClick={() => setCurrent((d) => addWeeks(d, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 gap-2 h-full" style={{ minHeight: '400px' }}>
          {days.map((day, i) => {
            const entries    = tasksForDay(day);
            const todayFlag  = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col rounded-xl border p-2 min-h-[300px] transition-colors
                  ${todayFlag ? 'border-brand-accent/50 bg-brand-accent/5' : 'border-app-border bg-app-card/40'}`}
              >
                <button
                  onClick={() => onDayClick && onDayClick(day)}
                  className={`flex flex-col items-center mb-2 pb-2 border-b border-app-border w-full
                    ${onDayClick ? 'cursor-pointer hover:opacity-70 transition-opacity' : 'cursor-default'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {WEEKDAYS[i]}
                  </span>
                  <span
                    className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-0.5
                      ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-300'}`}
                  >
                    {format(day, 'd')}
                  </span>
                </button>

                <div className="flex-1 overflow-y-auto">
                  {entries.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-slate-700 text-xs">—</span>
                    </div>
                  ) : (
                    entries.map(({ task, isFirst, isMultiDay }) => (
                      <WeekTaskBlock
                        key={`${task.taskId}-${day.toISOString()}`}
                        task={task}
                        members={members}
                        onClick={onTaskClick}
                        onStatusChange={onStatusChange}
                        isFirst={isFirst}
                        isMultiDay={isMultiDay}
                      />
                    ))
                  )}
                </div>

                {entries.length > 0 && (
                  <div className="mt-1 text-center text-[10px] text-slate-600">
                    {entries.length} task{entries.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
