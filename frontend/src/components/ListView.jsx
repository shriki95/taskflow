import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { Calendar, Plus, Circle, CheckCircle2, Clock, Trash2, FolderPlus } from 'lucide-react';
import Avatar from './Avatar';
import { isRTL } from '../utils/text';

const PRIORITY = {
  high: { label: 'High', cls: 'text-red-400 bg-red-400/10' },
  medium: { label: 'Medium', cls: 'text-amber-400 bg-amber-400/10' },
  low: { label: 'Low', cls: 'text-blue-400 bg-blue-400/10' },
};

const STATUS_ICON = {
  todo:        (props) => <Circle size={16} className="text-slate-500" {...props} />,
  in_progress: (props) => <Clock size={16} className="text-blue-400" {...props} />,
  done:        (props) => <CheckCircle2 size={16} className="text-emerald-400" {...props} />,
};

const STATUS_SECTIONS = [
  { id: 'todo',        label: 'To Do',       dot: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress',  dot: 'bg-blue-500' },
  { id: 'done',        label: 'Done',         dot: 'bg-emerald-500' },
];

function TaskRow({ task, members, onClick, onStatusChange, onDueDateChange }) {
  const [editingDate, setEditingDate] = useState(false);
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isDone = task.status === 'done';
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;

  const IconComponent = STATUS_ICON[task.status] || STATUS_ICON.todo;

  return (
    <tr
      onClick={onClick}
      className="group border-b border-app-border hover:bg-app-card/50 cursor-pointer transition-colors"
    >
      <td className="py-3 pl-4 pr-2 w-8">
        <button
          onClick={(e) => { e.stopPropagation(); if (onStatusChange) onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
          className="focus:outline-none hover:opacity-70 transition-opacity"
          title={isDone ? 'Mark as to-do' : 'Mark as done'}
        >
          <IconComponent />
        </button>
      </td>
      <td className="py-3 pr-3 w-full min-w-0">
        <span
          dir={isRTL(task.title) ? 'rtl' : 'ltr'}
          className={`text-sm font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {task.title}
        </span>
        {/* Priority badge — shown inline on mobile only */}
        <span className={`sm:hidden inline-flex mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>
          {priority.label}
        </span>
      </td>
      <td className="py-3 pr-3 w-24 hidden sm:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>
          {priority.label}
        </span>
      </td>
      <td className="py-3 pr-3 w-32 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
        {editingDate ? (
          <input
            autoFocus
            type="date"
            defaultValue={task.due_date ? task.due_date.slice(0, 10) : ''}
            onChange={(e) => { if (onDueDateChange) onDueDateChange(task.taskId, e.target.value || null); setEditingDate(false); }}
            onBlur={() => setEditingDate(false)}
            className="bg-app-bg border border-brand-accent rounded px-1.5 py-0.5 text-xs text-slate-300 [color-scheme:dark] focus:outline-none w-28"
          />
        ) : (
          <button
            onClick={() => { if (onDueDateChange) setEditingDate(true); }}
            className={`flex items-center gap-1 text-xs rounded px-1 py-0.5 transition
              ${isOverdue ? 'text-red-400 hover:bg-red-400/10' : dueDate ? 'text-slate-500 hover:text-slate-300 hover:bg-app-sidebar' : 'text-slate-700 hover:text-slate-500 hover:bg-app-sidebar'}`}
          >
            <Calendar size={12} />
            {dueDate ? format(dueDate, 'MMM d, yyyy') : <span className="opacity-0 group-hover:opacity-100">Add date</span>}
          </button>
        )}
      </td>
      <td className="py-3 pr-4 w-10 hidden sm:table-cell">
        {assignee ? <Avatar name={assignee.name} color={assignee.avatar_color} size="sm" /> : <span className="text-slate-700 text-xs">—</span>}
      </td>
    </tr>
  );
}

function StatusSectionHeader({ label, count, dot }) {
  return (
    <tr>
      <td colSpan={5} className="pt-5 pb-2 pl-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">
            {count}
          </span>
        </div>
      </td>
    </tr>
  );
}

function GroupSectionHeader({ group, taskCount, onRename, onDelete, onAddTask }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const commitRename = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== group.name) onRename(group.groupId, name.trim());
    else setName(group.name);
  };

  return (
    <tr>
      <td colSpan={5} className="pt-5 pb-1 pl-4 pr-4">
        <div className="flex items-center gap-2 group/hdr">
          <span className="w-2 h-2 rounded-full bg-brand-tertiary flex-shrink-0" />
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditing(false); setName(group.name); } }}
              className="text-xs font-bold text-slate-200 uppercase tracking-wider bg-transparent border-b border-brand-accent focus:outline-none w-40"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition">
              {group.name}
            </button>
          )}
          <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">{taskCount}</span>
          <div className="opacity-0 group-hover/hdr:opacity-100 flex items-center gap-1 ml-auto transition">
            <button
              onClick={() => onAddTask(group.groupId)}
              className="text-slate-600 hover:text-slate-300 p-1 rounded hover:bg-app-card transition"
              title="Add task to section"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={() => onDelete(group.groupId)}
              className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition"
              title="Delete section"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ListView({
  tasks, members, onTaskClick, onStatusChange, onDueDateChange, onAddTask,
  groups = [], onGroupCreate, onGroupUpdate, onGroupDelete,
}) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !onGroupCreate) return;
    await onGroupCreate(newGroupName.trim());
    setNewGroupName('');
    setAddingGroup(false);
  };

  const hasGroups = groups.length > 0;
  const activeTasks = tasks.filter((t) => t.status !== 'done');

  const renderGroupRows = () => {
    const rows = [];
    groups.forEach((group) => {
      const groupTasks = activeTasks.filter((t) => t.group_id === group.groupId);
      rows.push(
        <GroupSectionHeader
          key={`hdr-${group.groupId}`}
          group={group}
          taskCount={groupTasks.length}
          onRename={onGroupUpdate}
          onDelete={onGroupDelete}
          onAddTask={(gId) => onAddTask({ groupId: gId })}
        />
      );
      groupTasks.forEach((task) => rows.push(
        <TaskRow
          key={task.taskId}
          task={task}
          members={members}
          onClick={() => onTaskClick(task)}
          onStatusChange={onStatusChange}
          onDueDateChange={onDueDateChange}
        />
      ));
    });

    const ungrouped = activeTasks.filter((t) => !t.group_id);
    if (ungrouped.length > 0) {
      rows.push(
        <tr key="hdr-ungrouped">
          <td colSpan={5} className="pt-5 pb-1 pl-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No section</span>
              <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">{ungrouped.length}</span>
            </div>
          </td>
        </tr>
      );
      ungrouped.forEach((task) => rows.push(
        <TaskRow
          key={task.taskId}
          task={task}
          members={members}
          onClick={() => onTaskClick(task)}
          onStatusChange={onStatusChange}
          onDueDateChange={onDueDateChange}
        />
      ));
    }
    return rows;
  };

  const renderStatusRows = () =>
    STATUS_SECTIONS.flatMap((section) => {
      const sectionTasks = activeTasks.filter((t) => t.status === section.id);
      return [
        <StatusSectionHeader key={`hdr-${section.id}`} label={section.label} count={sectionTasks.length} dot={section.dot} />,
        ...sectionTasks.map((task) => (
          <TaskRow
            key={task.taskId}
            task={task}
            members={members}
            onClick={() => onTaskClick(task)}
            onStatusChange={onStatusChange}
            onDueDateChange={onDueDateChange}
          />
        )),
      ];
    });

  return (
    <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-app-border">
            <th className="py-3 pl-4 pr-2 w-8" />
            <th className="py-3 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</th>
            <th className="py-3 pr-3 w-24 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Priority</th>
            <th className="py-3 pr-3 w-32 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Due date</th>
            <th className="py-3 pr-4 w-10 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {hasGroups ? renderGroupRows() : renderStatusRows()}
        </tbody>
      </table>

      {/* Footer */}
      <div className="border-t border-app-border p-3">
        {addingGroup && (
          <form onSubmit={handleAddGroup} className="flex gap-2 mb-2">
            <input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Section name…"
              className="flex-1 bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-accent transition"
            />
            <button type="submit" disabled={!newGroupName.trim()} className="bg-brand-accent text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 font-medium transition">
              Add
            </button>
            <button type="button" onClick={() => { setAddingGroup(false); setNewGroupName(''); }} className="text-slate-500 hover:text-slate-300 px-2 py-1.5 text-sm transition">
              Cancel
            </button>
          </form>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => onAddTask({})}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm px-2 py-1.5 rounded-lg hover:bg-app-sidebar transition"
          >
            <Plus size={14} />
            Add task
          </button>
          {onGroupCreate && (
            <button
              onClick={() => setAddingGroup(true)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm px-2 py-1.5 rounded-lg hover:bg-app-sidebar transition"
            >
              <FolderPlus size={14} />
              New section
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
