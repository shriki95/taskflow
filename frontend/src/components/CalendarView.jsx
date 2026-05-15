import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import Avatar from './Avatar';

const PRIORITY_BAR = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-emerald-500',
};

function TaskChip({ task, members, onClick, onStatusChange }) {
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const isDone = task.status === 'done';

  const handleToggle = (e) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(task.taskId, isDone ? 'todo' : 'done');
    }
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer
        hover:opacity-80 transition mb-0.5 truncate
        ${isDone ? 'opacity-50' : ''}
        bg-app-sidebar border border-app-border`}
    >
      <button
        onClick={handleToggle}
        className="flex-shrink-0 focus:outline-none"
        title={isDone ? 'Mark as to-do' : 'Mark as done'}
      >
        {isDone
          ? <CheckCircle2 size={10} className="text-emerald-400" />
          : <Circle size={10} className="text-slate-600 hover:text-slate-400 transition-colors" />
        }
      </button>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_BAR[task.priority] || 'bg-slate-500'}`} />
      <span className={`truncate flex-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}>
        {task.title}
      </span>
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

export default function CalendarView({ tasks, members, onTaskClick, onStatusChange }) {
  const [current, setCurrent] = useState(new Date());

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const tasksForDay = (day) =>
    tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day));

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
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-px bg-app-border rounded-xl overflow-hidden border border-app-border">
          {days.map((day) => {
            const dayTasks  = tasksForDay(day);
            const inMonth   = isSameMonth(day, current);
            const todayFlag = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`bg-app-bg p-1.5 min-h-[90px] transition-colors
                  ${inMonth ? '' : 'opacity-30'}
                  ${todayFlag ? 'bg-brand-primary/40' : 'hover:bg-app-card/60'}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-end mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-400'}`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Tasks (max 3, then +N) */}
                {dayTasks.slice(0, 3).map((t) => (
                  <TaskChip
                    key={t.taskId}
                    task={t}
                    members={members}
                    onClick={onTaskClick}
                    onStatusChange={onStatusChange}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-xs text-slate-500 pl-1">+{dayTasks.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
