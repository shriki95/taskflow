import { useState, useRef, useEffect } from 'react';
import { format, isPast, isToday } from 'date-fns';
import {
  Calendar, Plus, Circle, CheckCircle2, Clock, Copy, Trash2, FolderPlus,
  MoreHorizontal, ArrowRight, GripVertical, RefreshCw,
} from 'lucide-react';
import {
  DndContext, closestCenter, MouseSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Avatar from './Avatar';
import { isRTL } from '../utils/text';

const TASK_PREFIX = 'task-';

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

// Shared column-width classes for consistent alignment
const COL = {
  status:   'w-8 flex-shrink-0 pl-4 pr-2',
  title:    'flex-1 min-w-0 pr-3',
  priority: 'w-24 flex-shrink-0 pr-3 hidden sm:flex items-center',
  dueDate:  'w-32 flex-shrink-0 pr-3 hidden sm:flex items-center',
  assignee: 'w-10 flex-shrink-0 pr-4 hidden sm:flex items-center',
  menu:     'w-8 flex-shrink-0 pr-2 hidden sm:flex items-center justify-center',
};

function TaskRow({ task, members, onClick, onStatusChange, onDueDateChange, allGroups = [], onDelete, onMoveToGroup, onDuplicate, density = 'comfortable' }) {
  const [editingDate, setEditingDate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef();
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const assignee = members.find((m) => m.userId === task.assignee_id);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isDone = task.status === 'done';
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;
  const otherGroups = allGroups.filter((g) => g.groupId !== task.group_id);
  const showMenu = onDelete || onDuplicate || (onMoveToGroup && otherGroups.length > 0);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (!menuContainerRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const IconComponent = STATUS_ICON[task.status] || STATUS_ICON.todo;

  const rowPy   = density === 'dense' ? 'py-1' : density === 'compact' ? 'py-1.5' : 'py-3';
  const textSz  = density === 'dense' ? 'text-xs' : 'text-sm';
  const iconSz  = density === 'dense' ? 14 : 16;

  return (
    <div
      onClick={onClick}
      className="group flex items-center border-b border-app-border hover:bg-app-card/50 cursor-pointer transition-colors"
    >
      <div className={`${COL.status} ${rowPy}`}>
        <button
          onClick={(e) => { e.stopPropagation(); if (onStatusChange) onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
          className="focus:outline-none hover:opacity-70 transition-opacity"
          title={isDone ? 'Mark as to-do' : 'Mark as done'}
        >
          <IconComponent size={iconSz} />
        </button>
      </div>

      <div
        className={`${COL.title} ${rowPy} flex flex-col ${isRTL(task.title) ? 'items-end text-right' : 'items-start'}`}
        dir={isRTL(task.title) ? 'rtl' : 'ltr'}
      >
        <span className={`${textSz} font-medium truncate w-full flex items-center gap-1.5 ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
          {task.title}
          {task.parent_task_id && (
            <RefreshCw size={10} className="text-brand-accent/60 flex-shrink-0" title="Recurring instance" />
          )}
        </span>
        <span className={`sm:hidden mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>
          {priority.label}
        </span>
      </div>

      <div className={`${COL.priority} ${rowPy}`}>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>
          {priority.label}
        </span>
      </div>

      <div className={`${COL.dueDate} ${rowPy}`} onClick={(e) => e.stopPropagation()}>
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
            {dueDate
              ? format(dueDate, density === 'dense' ? 'MMM d' : 'MMM d, yyyy')
              : <span className="text-slate-600">Add date</span>
            }
          </button>
        )}
      </div>

      <div className={`${COL.assignee} ${rowPy}`}>
        {assignee
          ? <Avatar name={assignee.name} color={assignee.avatar_color} size="sm" />
          : <span className="text-slate-700 text-xs">—</span>
        }
      </div>

      {showMenu && (
        <div
          ref={menuContainerRef}
          className={`${COL.menu} ${rowPy} relative`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-app-sidebar transition"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-50 bg-app-card border border-app-border rounded-lg shadow-xl min-w-[160px] py-1">
              {onMoveToGroup && otherGroups.length > 0 && (
                <>
                  <div className="px-3 pt-1.5 pb-1 text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                    Move to
                  </div>
                  {otherGroups.map((g) => (
                    <button
                      key={g.groupId}
                      onClick={() => { onMoveToGroup(task.taskId, g.groupId); setMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-app-bg transition"
                    >
                      <ArrowRight size={11} className="flex-shrink-0" />
                      {g.name}
                    </button>
                  ))}
                  {onDelete && <div className="my-1 border-t border-app-border" />}
                </>
              )}
              {onDuplicate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(task.taskId); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-app-bg transition"
                >
                  <Copy size={11} />
                  Duplicate task
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task.taskId); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition"
                >
                  <Trash2 size={11} />
                  Delete task
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeaderRow({ label, count, dot }) {
  const rtl = isRTL(label);
  return (
    <div className="pt-5 pb-2 px-4">
      <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider" dir={rtl ? 'rtl' : 'ltr'}>{label}</span>
        <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">
          {count}
        </span>
      </div>
    </div>
  );
}

function GroupSectionHeader({ group, taskCount, onRename, onDelete, onAddTask, dragHandleProps }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const commitRename = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== group.name) onRename(group.groupId, name.trim());
    else setName(group.name);
  };

  const rtl = isRTL(group.name);
  return (
    <div className="pt-5 pb-1 px-4">
      <div className={`flex items-center gap-2 group/hdr ${rtl ? 'flex-row-reverse' : ''}`}>
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="text-slate-700 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/hdr:opacity-100 transition touch-none p-0.5 flex-shrink-0"
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </button>
        )}
        <span className="w-2 h-2 rounded-full bg-brand-tertiary flex-shrink-0" />
        {editing ? (
          <input
            autoFocus
            value={name}
            dir={rtl ? 'rtl' : 'ltr'}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditing(false); setName(group.name); } }}
            className="text-xs font-bold text-slate-200 uppercase tracking-wider bg-transparent border-b border-brand-accent focus:outline-none w-40"
          />
        ) : (
          <button onClick={() => setEditing(true)} dir={rtl ? 'rtl' : 'ltr'} className="text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition">
            {group.name}
          </button>
        )}
        <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">{taskCount}</span>
        <div className={`opacity-0 group-hover/hdr:opacity-100 flex items-center gap-1 ${rtl ? 'mr-auto' : 'ml-auto'} transition`}>
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
    </div>
  );
}

function SortableTaskRow({ task, members, onTaskClick, onStatusChange, onDueDateChange, allGroups, onTaskDelete, onTaskDuplicate, onColumnChange, density }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: `${TASK_PREFIX}${task.taskId}` });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskRow
        task={task}
        members={members}
        onClick={() => onTaskClick(task)}
        onStatusChange={onStatusChange}
        onDueDateChange={onDueDateChange}
        allGroups={allGroups}
        onDelete={onTaskDelete}
        onDuplicate={onTaskDuplicate}
        onMoveToGroup={onColumnChange}
        density={density}
      />
    </div>
  );
}

function SortableGroupSection({ group, tasks, members, onTaskClick, onStatusChange, onDueDateChange, onRename, onDelete, onAddTask, allGroups, onTaskDelete, onTaskDuplicate, onColumnChange, density }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: group.groupId });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <GroupSectionHeader
        group={group}
        taskCount={tasks.length}
        onRename={onRename}
        onDelete={onDelete}
        onAddTask={(gId) => onAddTask({ groupId: gId })}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      <SortableContext items={tasks.map((t) => `${TASK_PREFIX}${t.taskId}`)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableTaskRow
            key={task.taskId}
            task={task}
            members={members}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
            onDueDateChange={onDueDateChange}
            allGroups={allGroups}
            onTaskDelete={onTaskDelete}
            onTaskDuplicate={onTaskDuplicate}
            onColumnChange={onColumnChange}
            density={density}
          />
        ))}
      </SortableContext>
    </div>
  );
}

export default function ListView({
  tasks, members, onTaskClick, onStatusChange, onDueDateChange, onAddTask,
  groups = [], onGroupCreate, onGroupUpdate, onGroupDelete, onGroupReorder,
  onColumnChange, onTaskDelete, onTaskDuplicate, onTasksReorder, density = 'comfortable',
}) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  );

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !onGroupCreate) return;
    await onGroupCreate(newGroupName.trim());
    setNewGroupName('');
    setAddingGroup(false);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const activeStr = String(active.id);
    if (activeStr.startsWith(TASK_PREFIX)) {
      const overStr = String(over.id);
      if (!overStr.startsWith(TASK_PREFIX)) return;
      const activeTaskId = activeStr.slice(TASK_PREFIX.length);
      const overTaskId = overStr.slice(TASK_PREFIX.length);
      const activeTasks = tasks.filter((t) => t.status !== 'done');
      for (const group of groups) {
        const gTasks = activeTasks.filter((t) => t.group_id === group.groupId);
        const oldIdx = gTasks.findIndex((t) => t.taskId === activeTaskId);
        const newIdx = gTasks.findIndex((t) => t.taskId === overTaskId);
        if (oldIdx !== -1 && newIdx !== -1) {
          if (onTasksReorder) onTasksReorder(arrayMove(gTasks, oldIdx, newIdx).map((t) => t.taskId));
          break;
        }
      }
    } else {
      const oldIdx = groups.findIndex((g) => g.groupId === active.id);
      const newIdx = groups.findIndex((g) => g.groupId === over.id);
      if (oldIdx !== -1 && newIdx !== -1 && onGroupReorder) {
        onGroupReorder(arrayMove(groups, oldIdx, newIdx));
      }
    }
  };

  const hasGroups = groups.length > 0;
  const activeTasks = tasks.filter((t) => t.status !== 'done');

  const renderGroupContent = () => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groups.map((g) => g.groupId)} strategy={verticalListSortingStrategy}>
        {groups.map((group) => {
          const groupTasks = activeTasks.filter((t) => t.group_id === group.groupId);
          return (
            <SortableGroupSection
              key={group.groupId}
              group={group}
              tasks={groupTasks}
              members={members}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
              onDueDateChange={onDueDateChange}
              onRename={onGroupUpdate}
              onDelete={onGroupDelete}
              onAddTask={onAddTask}
              allGroups={groups}
              onTaskDelete={onTaskDelete}
              onTaskDuplicate={onTaskDuplicate}
              onColumnChange={onColumnChange}
              density={density}
            />
          );
        })}
      </SortableContext>

      {/* Ungrouped tasks */}
      {(() => {
        const ungrouped = activeTasks.filter((t) => !t.group_id);
        if (!ungrouped.length) return null;
        return (
          <div>
            <div className="pt-5 pb-1 pl-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">No section</span>
                <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5">{ungrouped.length}</span>
              </div>
            </div>
            {ungrouped.map((task) => (
              <TaskRow
                key={task.taskId}
                task={task}
                members={members}
                onClick={() => onTaskClick(task)}
                onStatusChange={onStatusChange}
                onDueDateChange={onDueDateChange}
                allGroups={groups}
                onDelete={onTaskDelete}
                onDuplicate={onTaskDuplicate}
                onMoveToGroup={onColumnChange}
                density={density}
              />
            ))}
          </div>
        );
      })()}
    </DndContext>
  );

  const renderStatusContent = () =>
    STATUS_SECTIONS.flatMap((section) => {
      const sectionTasks = activeTasks.filter((t) => t.status === section.id);
      return [
        <SectionHeaderRow key={`hdr-${section.id}`} label={section.label} count={sectionTasks.length} dot={section.dot} />,
        ...sectionTasks.map((task) => (
          <TaskRow
            key={task.taskId}
            task={task}
            members={members}
            onClick={() => onTaskClick(task)}
            onStatusChange={onStatusChange}
            onDueDateChange={onDueDateChange}
            onDelete={onTaskDelete}
            density={density}
          />
        )),
      ];
    });

  return (
    <div className="bg-app-card border border-app-border rounded-xl overflow-hidden">
      {/* Header */}
      {(() => {
        const hdrPy = density === 'dense' ? 'py-1' : density === 'compact' ? 'py-1.5' : 'py-3';
        return (
          <div className="flex items-center border-b border-app-border">
            <div className={`${COL.status} ${hdrPy}`} />
            <div className={`${COL.title} ${hdrPy} text-xs font-semibold text-slate-500 uppercase tracking-wider`}>Task</div>
            <div className={`${COL.priority} ${hdrPy} text-xs font-semibold text-slate-500 uppercase tracking-wider`}>Priority</div>
            <div className={`${COL.dueDate} ${hdrPy} text-xs font-semibold text-slate-500 uppercase tracking-wider`}>Due date</div>
            <div className={`${COL.assignee} ${hdrPy} text-xs font-semibold text-slate-500 uppercase tracking-wider`}>Assignee</div>
            <div className={`${COL.menu} ${hdrPy}`} />
          </div>
        );
      })()}

      {/* Content */}
      {hasGroups ? renderGroupContent() : renderStatusContent()}

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
