import { useState, useRef, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import Avatar from './Avatar';
import { isRTL } from '../utils/text';

const PRIORITY_BAR = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-emerald-500',
};

function getTaskSpan(task) {
  if (!task.due_date) return [];
  const due = new Date(task.due_date);
  if (!task.span_days || task.span_days <= 1) return [due];
  const days = task.span_days;
  return Array.from({ length: days }, (_, i) => addDays(due, -(days - 1 - i)));
}

function TaskChip({ task, members, onClick, onStatusChange, isFirst, isMultiDay }) {
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const isDone = task.status === 'done';

  if (!isFirst && isMultiDay) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(task); }}
        className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer
          hover:opacity-90 transition mb-0.5 truncate opacity-70
          bg-app-sidebar border border-app-border border-l-2`}
        style={{ borderLeftColor: task.priority === 'high' ? '#ef4444' : task.priority === 'low' ? '#10b981' : '#f59e0b' }}
      >
        <span className="truncate flex-1 text-slate-400" dir={isRTL(task.title) ? 'rtl' : 'ltr'}>
          {task.title}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer
        hover:opacity-80 transition mb-0.5 truncate
        ${isDone ? 'opacity-50' : ''}
        bg-app-sidebar border border-app-border`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (onStatusChange) onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
        className="flex-shrink-0 focus:outline-none"
      >
        {isDone
          ? <CheckCircle2 size={10} className="text-emerald-400" />
          : <Circle size={10} className="text-slate-600 hover:text-slate-400 transition-colors" />
        }
      </button>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_BAR[task.priority] || 'bg-slate-500'}`} />
      <span
        dir={isRTL(task.title) ? 'rtl' : 'ltr'}
        className={`truncate flex-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}
      >
        {task.title}
      </span>
      {isMultiDay && <span className="text-slate-600 text-[9px] flex-shrink-0">→</span>}
      {assignee && (
        <span
          className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
          style={{ backgroundColor: assignee.avatar_color }}
        >
          {assignee.name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function CalendarView({ tasks, members, onTaskClick, onStatusChange, onDayClick }) {
  const [current, setCurrent] = useState(new Date());
  const [popover, setPopover] = useState(null); // { isoDay, top, left }
  const hideTimer = useRef(null);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd });

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

  const showPopover = useCallback((e, isoDay) => {
    clearTimeout(hideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ isoDay, top: rect.top, left: rect.left + rect.width + 6 });
  }, []);

  const startHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setPopover(null), 120);
  }, []);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimer.current);
  }, []);

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-100">
          {format(current, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent((d) => subMonths(d, 1))}
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
            onClick={() => setCurrent((d) => addMonths(d, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-app-border rounded-xl overflow-hidden border border-app-border">
          {days.map((day) => {
            const dayEntries = tasksForDay(day);
            const inMonth   = isSameMonth(day, current);
            const todayFlag = isToday(day);
            const visible   = dayEntries.slice(0, 3);
            const overflow  = dayEntries.length - 3;
            const isoDay    = day.toISOString();

            return (
              <div
                key={isoDay}
                onClick={() => onDayClick && onDayClick(day)}
                className={`bg-app-bg p-1.5 min-h-[90px] transition-colors cursor-pointer
                  ${inMonth ? '' : 'opacity-30'}
                  ${todayFlag ? 'bg-brand-primary/40' : 'hover:bg-app-card/60'}`}
              >
                <div className="flex items-center justify-end mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-400'}`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {visible.map(({ task, isFirst, isMultiDay }) => (
                  <TaskChip
                    key={`${task.taskId}-${isoDay}`}
                    task={task}
                    members={members}
                    onClick={onTaskClick}
                    onStatusChange={onStatusChange}
                    isFirst={isFirst}
                    isMultiDay={isMultiDay}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => showPopover(e, isoDay)}
                    onMouseLeave={startHide}
                    className="text-xs text-slate-500 hover:text-slate-300 pl-1 transition"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overflow popover (fixed position to escape overflow:hidden) */}
      {popover && (() => {
        const popDay = days.find((d) => d.toISOString() === popover.isoDay);
        if (!popDay) return null;
        const allEntries = tasksForDay(popDay);
        return (
          <div
            className="fixed z-50 bg-app-card border border-app-border rounded-xl shadow-2xl p-2 w-60 max-h-72 overflow-y-auto"
            style={{ top: Math.min(popover.top, window.innerHeight - 300), left: Math.min(popover.left, window.innerWidth - 260) }}
            onMouseEnter={cancelHide}
            onMouseLeave={startHide}
          >
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {format(popDay, 'MMM d')} · {allEntries.length} tasks
            </p>
            {allEntries.map(({ task, isFirst, isMultiDay }) => (
              <TaskChip
                key={`pop-${task.taskId}`}
                task={task}
                members={members}
                onClick={(t) => { setPopover(null); onTaskClick(t); }}
                onStatusChange={onStatusChange}
                isFirst={isFirst}
                isMultiDay={isMultiDay}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
