import { useState } from 'react';
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Calendar, Flag } from 'lucide-react';
import Avatar from './Avatar';

const STATUS_SECTIONS = [
  { id: 'todo',        label: 'To Do',       dot: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress',  dot: 'bg-blue-500' },
  { id: 'done',        label: 'Done',         dot: 'bg-emerald-500' },
];

const PRIORITY_COLOR = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-emerald-400' };

const STATUS_ICON = {
  todo:        <Circle size={15} className="text-slate-500" />,
  in_progress: <Clock size={15} className="text-blue-400" />,
  done:        <CheckCircle2 size={15} className="text-emerald-400" />,
};

function TaskRow({ task, members, onClick, onStatusChange }) {
  const isDone = task.status === 'done';
  const assignee = members.find((m) => m.userId === task.assignee_id);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-app-sidebar/50 transition border-b border-app-border last:border-0 ${isDone ? 'opacity-60' : ''}`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
        className="flex-shrink-0 focus:outline-none hover:opacity-70 transition-opacity"
        title={isDone ? 'Mark as to-do' : 'Mark as done'}
      >
        {STATUS_ICON[task.status] || STATUS_ICON.todo}
      </button>
      <span className={`text-sm font-medium flex-1 min-w-0 truncate ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
        {task.title}
      </span>
      <Flag size={12} className={`flex-shrink-0 ${PRIORITY_COLOR[task.priority] || 'text-slate-600'}`} />
      {assignee && <Avatar name={assignee.name} color={assignee.avatar_color} size="xs" />}
    </div>
  );
}

export default function DayView({ tasks, members, onTaskClick, onStatusChange }) {
  const [current, setCurrent] = useState(new Date());

  const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), current));
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
          <div className="space-y-4">
            {STATUS_SECTIONS.map((section) => {
              const sectionTasks = dayTasks.filter((t) => t.status === section.id);
              if (sectionTasks.length === 0) return null;
              return (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${section.dot}`} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {section.label}
                    </span>
                    <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">
                      {sectionTasks.length}
                    </span>
                  </div>
                  <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
                    {sectionTasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        members={members}
                        onClick={() => onTaskClick(task)}
                        onStatusChange={onStatusChange}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
