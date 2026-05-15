import { format, isPast, isToday } from 'date-fns';
import { Calendar, Plus, Circle, CheckCircle2, Clock } from 'lucide-react';
import Avatar from './Avatar';

const PRIORITY = {
  high: { label: 'High', cls: 'text-red-400 bg-red-400/10' },
  medium: { label: 'Medium', cls: 'text-amber-400 bg-amber-400/10' },
  low: { label: 'Low', cls: 'text-emerald-400 bg-emerald-400/10' },
};

const STATUS_ICON = {
  todo: <Circle size={16} className="text-slate-500" />,
  in_progress: <Clock size={16} className="text-blue-400" />,
  done: <CheckCircle2 size={16} className="text-emerald-400" />,
};

function TaskRow({ task, members, onClick }) {
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== 'done';

  return (
    <tr
      onClick={onClick}
      className="group border-b border-app-border hover:bg-app-card/50 cursor-pointer transition-colors"
    >
      <td className="py-3 pl-4 pr-2 w-8">
        {STATUS_ICON[task.status] || STATUS_ICON.todo}
      </td>

      <td className="py-3 pr-3 min-w-0">
        <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
          {task.title}
        </span>
      </td>

      <td className="py-3 pr-3 w-24 hidden sm:table-cell">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}
        >
          {priority.label}
        </span>
      </td>

      <td className="py-3 pr-3 w-28 hidden md:table-cell">
        {dueDate ? (
          <span
            className={`flex items-center gap-1 text-xs ${
              isOverdue ? 'text-red-400' : 'text-slate-500'
            }`}
          >
            <Calendar size={12} />
            {format(dueDate, 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-slate-700 text-xs">—</span>
        )}
      </td>

      <td className="py-3 pr-4 w-10">
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.avatar_color} size="sm" />
        ) : (
          <span className="text-slate-700 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

function SectionHeader({ label, count, dot }) {
  return (
    <tr>
      <td colSpan={5} className="pt-5 pb-2 pl-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">
            {count}
          </span>
        </div>
      </td>
    </tr>
  );
}

export default function ListView({ tasks, members, onTaskClick, onAddTask }) {
  const sections = [
    { id: 'todo', label: 'To Do', dot: 'bg-slate-500' },
    { id: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
    { id: 'done', label: 'Done', dot: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-app-border">
            <th className="py-3 pl-4 pr-2 w-8" />
            <th className="py-3 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Task
            </th>
            <th className="py-3 pr-3 w-24 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
              Priority
            </th>
            <th className="py-3 pr-3 w-28 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
              Due date
            </th>
            <th className="py-3 pr-4 w-10 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assignee
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            const sectionTasks = tasks.filter((t) => t.status === section.id);
            return (
              <>
                <SectionHeader
                  key={`hdr-${section.id}`}
                  label={section.label}
                  count={sectionTasks.length}
                  dot={section.dot}
                />
                {sectionTasks.map((task) => (
                  <TaskRow
                    key={task.taskId}
                    task={task}
                    members={members}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
              </>
            );
          })}
        </tbody>
      </table>

      {/* Add task button */}
      <div className="border-t border-app-border p-3">
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm px-2 py-1.5 rounded-lg hover:bg-app-sidebar transition w-full"
        >
          <Plus size={14} />
          Add task
        </button>
      </div>
    </div>
  );
}
