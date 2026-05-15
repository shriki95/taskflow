import { Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import Avatar from './Avatar';

const PRIORITY = {
  high: { label: 'High', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  medium: { label: 'Medium', cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  low: { label: 'Low', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
};

export default function TaskCard({ task, members = [], onClick, dragging = false }) {
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== 'done';

  return (
    <div
      onClick={onClick}
      className={`bg-app-card border rounded-xl p-3.5 mb-2 cursor-pointer transition-all group select-none
        ${dragging
          ? 'border-violet-500 shadow-lg shadow-violet-500/20 rotate-1'
          : 'border-app-border hover:border-slate-600 hover:shadow-md'
        }`}
    >
      {/* Title */}
      <p className="text-sm text-slate-200 font-medium leading-snug mb-3 line-clamp-2 group-hover:text-slate-100">
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priority.cls}`}
        >
          {priority.label}
        </span>

        <div className="flex items-center gap-2">
          {dueDate && (
            <span
              className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-400' : 'text-slate-500'
              }`}
            >
              <Calendar size={11} />
              {format(dueDate, 'MMM d')}
            </span>
          )}
          {assignee && (
            <Avatar
              name={assignee.name}
              color={assignee.avatar_color}
              size="xs"
            />
          )}
        </div>
      </div>
    </div>
  );
}
