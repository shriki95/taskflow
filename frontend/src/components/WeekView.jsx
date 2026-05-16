import { useState } from 'react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, addWeeks, subWeeks, isSameMonth, addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { isRTL, formatDuration } from '../utils/text';

const PRIORITY_BAR    = { high: 'bg-red-500',    medium: 'bg-amber-500',    low: 'bg-emerald-500'    };
const PRIORITY_BORDER = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-emerald-500' };
const PRIORITY_BG     = { high: 'bg-red-500/5',  medium: 'bg-amber-500/5',  low: 'bg-emerald-500/5'  };
const PRIORITY_SPAN   = {
  high:   'bg-red-500/15 border-red-500/40 text-red-200',
  medium: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
  low:    'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
};

// Returns span of dates; tasks < 1 day always return single-element array
function getTaskSpan(task) {
  if (!task.due_date) return [];
  const due = new Date(task.due_date);
  if (!task.duration_minutes || task.duration_minutes < 1440) return [due];
  const days = Math.ceil(task.duration_minutes / 1440);
  return Array.from({ length: days }, (_, i) => addDays(due, -(days - 1 - i)));
}

function blockHeight(duration_minutes) {
  if (!duration_minutes || duration_minutes >= 1440) return 56;
  const hours = duration_minutes / 60;
  return Math.max(56, Math.min(Math.round(hours * 56), 280));
}

// Place multi-day tasks into rows avoiding overlap
function computeMultiDayLayout(multiDaySpans, weekDays) {
  const positioned = [];
  for (const { task, span } of multiDaySpans) {
    const startCol = weekDays.findIndex((d) => span.some((s) => isSameDay(s, d)));
    if (startCol === -1) continue;
    let endCol = -1;
    for (let i = weekDays.length - 1; i >= 0; i--) {
      if (span.some((s) => isSameDay(s, weekDays[i]))) { endCol = i; break; }
    }
    if (endCol === -1) continue;

    const startsThisWeek = isSameDay(span[0], weekDays[startCol]);
    const endsThisWeek   = isSameDay(span[span.length - 1], weekDays[endCol]);

    let row = 0;
    while (positioned.some((p) => p.row === row && p.startCol <= endCol && p.endCol >= startCol)) row++;
    positioned.push({ task, startCol, endCol, row, startsThisWeek, endsThisWeek });
  }
  return positioned;
}

function SingleDayBlock({ task, members, onClick, onStatusChange }) {
  const isDone   = task.status === 'done';
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const height   = blockHeight(task.duration_minutes);
  const durLabel = formatDuration(task.duration_minutes);

  return (
    <div
      onClick={() => onClick(task)}
      style={{ height: `${height}px` }}
      className={`flex flex-col gap-0.5 px-1.5 py-1 rounded-md text-xs cursor-pointer
        hover:opacity-80 transition mb-1 overflow-hidden border-l-2
        ${PRIORITY_BORDER[task.priority] || 'border-l-slate-500'}
        ${PRIORITY_BG[task.priority] || ''}
        bg-app-sidebar border border-app-border
        ${isDone ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
          className="flex-shrink-0 focus:outline-none"
        >
          {isDone
            ? <CheckCircle2 size={10} className="text-emerald-400" />
            : <Circle size={10} className="text-slate-600 hover:text-slate-400 transition-colors" />}
        </button>
        <span
          dir={isRTL(task.title) ? 'rtl' : 'ltr'}
          className={`truncate flex-1 font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {task.title}
        </span>
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekView({ tasks, members, onTaskClick, onStatusChange, initialDate, onDayClick }) {
  const [current, setCurrent] = useState(initialDate || new Date());

  const weekStart = startOfWeek(current, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(current, { weekStartsOn: 0 });
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const taskSpans = tasks
    .filter((t) => t.due_date)
    .map((t) => ({ task: t, span: getTaskSpan(t) }));

  // Separate day-span tasks from hour/minute tasks
  const isSpanTask = (task) => task.duration_minutes && task.duration_minutes >= 1440;

  const multiDaySpans  = taskSpans.filter(({ task }) => isSpanTask(task));
  const multiDayLayout = computeMultiDayLayout(multiDaySpans, days);
  const numSpanRows    = multiDayLayout.reduce((max, { row }) => Math.max(max, row + 1), 0);

  const singleTasksForDay = (day) =>
    taskSpans
      .filter(({ task, span }) => !isSpanTask(task) && span.some((d) => isSameDay(d, day)))
      .map(({ task }) => task);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Navigation */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-100">
          {format(weekStart, 'MMM d')} – {format(weekEnd, isSameMonth(weekStart, weekEnd) ? 'd, yyyy' : 'MMM d, yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent((d) => subWeeks(d, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setCurrent(new Date())} className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition border border-app-border">
            This week
          </button>
          <button onClick={() => setCurrent((d) => addWeeks(d, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Day headers + spanning tasks panel */}
        <div className="border border-app-border rounded-xl overflow-hidden mb-3">
          {/* Day headers row */}
          <div className="grid grid-cols-7 divide-x divide-app-border bg-app-card/50">
            {days.map((day, i) => {
              const todayFlag = isToday(day);
              return (
                <button
                  key={i}
                  onClick={() => onDayClick?.(day)}
                  className={`flex flex-col items-center py-2.5 transition w-full
                    ${todayFlag ? 'bg-brand-accent/10' : 'hover:bg-app-sidebar'}
                    ${onDayClick ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {WEEKDAYS[i]}
                  </span>
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-0.5
                    ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Day-spanning tasks (all-day row) */}
          {numSpanRows > 0 && (
            <div
              className="grid grid-cols-7 border-t border-app-border bg-app-bg/40 p-1"
              style={{ gridTemplateRows: `repeat(${numSpanRows}, 28px)` }}
            >
              {multiDayLayout.map(({ task, startCol, endCol, row, startsThisWeek, endsThisWeek }) => {
                const isDone  = task.status === 'done';
                const spanCls = PRIORITY_SPAN[task.priority] || 'bg-slate-500/15 border-slate-500/30 text-slate-300';
                const durLabel = formatDuration(task.duration_minutes);
                return (
                  <div
                    key={task.taskId}
                    onClick={() => onTaskClick(task)}
                    style={{ gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: row + 1 }}
                    className={`flex items-center gap-1.5 px-2 mx-0.5 my-0.5 rounded-md text-xs
                      border cursor-pointer hover:opacity-80 transition overflow-hidden
                      ${spanCls} ${isDone ? 'opacity-40' : ''}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
                      className="flex-shrink-0 focus:outline-none"
                    >
                      {isDone ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                    </button>
                    {!startsThisWeek && <span className="opacity-40 text-[8px] flex-shrink-0">◀</span>}
                    <span
                      dir={isRTL(task.title) ? 'rtl' : 'ltr'}
                      className={`truncate flex-1 font-medium ${isDone ? 'line-through' : ''}`}
                    >
                      {task.title}
                    </span>
                    {durLabel && startsThisWeek && (
                      <span className="opacity-50 text-[9px] flex-shrink-0 hidden sm:inline">{durLabel}</span>
                    )}
                    {!endsThisWeek && <span className="opacity-40 text-[8px] flex-shrink-0">▶</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Single-day (hour/minute) task columns */}
        <div className="grid grid-cols-7 gap-2" style={{ minHeight: '180px' }}>
          {days.map((day, i) => {
            const singleTasks = singleTasksForDay(day);
            const todayFlag   = isToday(day);
            return (
              <div
                key={i}
                className={`flex flex-col rounded-xl border p-2 min-h-[160px] transition-colors
                  ${todayFlag ? 'border-brand-accent/50 bg-brand-accent/5' : 'border-app-border bg-app-card/40'}`}
              >
                {singleTasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-slate-700 text-xs">—</span>
                  </div>
                ) : (
                  singleTasks.map((task) => (
                    <SingleDayBlock
                      key={task.taskId}
                      task={task}
                      members={members}
                      onClick={onTaskClick}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
