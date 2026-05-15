import { useState } from 'react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, addWeeks, subWeeks, isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

const PRIORITY_BAR = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };

function WeekTaskChip({ task, members, onClick, onStatusChange }) {
  const isDone = task.status === 'done';
  const assignee = members.find((m) => m.userId === task.assignee_id);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs cursor-pointer hover:opacity-80 transition mb-1
        ${isDone ? 'opacity-50' : ''}
        bg-app-sidebar border border-app-border`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
        className="flex-shrink-0 focus:outline-none"
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

export default function WeekView({ tasks, members, onTaskClick, onStatusChange }) {
  const [current, setCurrent] = useState(new Date());

  const weekStart = startOfWeek(current, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(current, { weekStartsOn: 0 });
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const tasksForDay = (day) =>
    tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day));

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
            const dayTasks  = tasksForDay(day);
            const todayFlag = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col rounded-xl border p-2 min-h-[300px] transition-colors
                  ${todayFlag ? 'border-brand-accent/50 bg-brand-accent/5' : 'border-app-border bg-app-card/40'}`}
              >
                {/* Day header */}
                <div className="flex flex-col items-center mb-2 pb-2 border-b border-app-border">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {WEEKDAYS[i]}
                  </span>
                  <span
                    className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-0.5
                      ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-300'}`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto">
                  {dayTasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-slate-700 text-xs">—</span>
                    </div>
                  ) : (
                    dayTasks.map((t) => (
                      <WeekTaskChip
                        key={t.taskId}
                        task={t}
                        members={members}
                        onClick={onTaskClick}
                        onStatusChange={onStatusChange}
                      />
                    ))
                  )}
                </div>

                {dayTasks.length > 0 && (
                  <div className="mt-1 text-center text-[10px] text-slate-600">
                    {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
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
