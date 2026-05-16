import { useState } from 'react';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Avatar from './Avatar';
import { isRTL, formatDuration } from '../utils/text';

const PRIORITY = {
  high: { label: 'High', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  medium: { label: 'Medium', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  low: { label: 'Low', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
};

export default function TaskCard({ task, members = [], onClick, onStatusChange, onDueDateChange, dragging = false }) {
  const [editingDate, setEditingDate] = useState(false);
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isDone = task.status === 'done';
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;

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

  return (
    <div
      onClick={onClick}
      className={`bg-app-card border rounded-xl p-3.5 mb-2 cursor-pointer transition-all group select-none
        ${isDone ? 'opacity-60' : ''}
        ${dragging
          ? 'border-brand-accent shadow-lg shadow-brand-accent/20 rotate-1'
          : 'border-app-border hover:border-slate-600 hover:shadow-md'
        }`}
    >
      {/* Title row with done toggle */}
      <div className="flex items-start gap-2 mb-3">
        <button
          onClick={handleToggleDone}
          className="flex-shrink-0 mt-0.5 focus:outline-none"
          title={isDone ? 'Mark as to-do' : 'Mark as done'}
        >
          {isDone
            ? <CheckCircle2 size={16} className="text-emerald-400" />
            : <Circle size={16} className="text-slate-600 hover:text-slate-400 transition-colors" />
          }
        </button>
        <p
          dir={isRTL(task.title) ? 'rtl' : 'ltr'}
          className={`text-sm font-medium leading-snug group-hover:text-slate-100 flex-1
            ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {task.title}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priority.cls}`}>
            {priority.label}
          </span>
          {formatDuration(task.duration_minutes) && (
            <span className="flex items-center gap-0.5 text-xs text-slate-500 bg-app-bg border border-app-border px-1.5 py-0.5 rounded-full">
              <Clock size={9} />
              {formatDuration(task.duration_minutes)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
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
              {dueDate ? format(dueDate, 'MMM d') : <span className="opacity-0 group-hover:opacity-100">Add date</span>}
            </button>
          )}
          {assignee && (
            <Avatar name={assignee.name} color={assignee.avatar_color} size="xs" />
          )}
        </div>
      </div>
    </div>
  );
}
