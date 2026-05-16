import { useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Check, X, Trash2, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { isThisWeek, isThisMonth } from 'date-fns';
import TaskCard from './TaskCard';

const COL_COLORS = [
  '#64748b', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#10b981', '#ef4444', '#06b6d4',
];

function SortableCard({ task, members, onClick, onStatusChange, onDueDateChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.taskId });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        members={members}
        onClick={onClick}
        onStatusChange={onStatusChange}
        onDueDateChange={onDueDateChange}
      />
    </div>
  );
}

function Column({ col, tasks, members, colorIndex, onTaskClick, onAddTask, onStatusChange, onDueDateChange, onRename, onDelete, deletable }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(col.name);
  const inputRef = useRef();
  const color = colorIndex < 0 ? '#475569' : COL_COLORS[colorIndex % COL_COLORS.length];

  const startEdit = () => {
    setEditing(true);
    setDraftName(col.name);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== col.name) {
      onRename(col.id, trimmed);
    } else {
      setDraftName(col.name);
    }
  };

  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1 group/header">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {editing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') { setEditing(false); setDraftName(col.name); }
              }}
              className="bg-app-bg border border-brand-accent rounded px-2 py-0.5 text-xs font-bold text-slate-200 focus:outline-none flex-1 min-w-0 uppercase tracking-wider"
            />
          ) : (
            <button
              onClick={startEdit}
              className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate hover:text-slate-200 transition text-left"
              title="Click to rename"
            >
              {col.name}
            </button>
          )}
          <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5 py-0.5 min-w-[20px] text-center flex-shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition">
          <button
            onClick={() => onAddTask({ groupId: col.id })}
            className="text-slate-600 hover:text-slate-300 p-1.5 rounded hover:bg-app-card transition"
            title="Add task"
          >
            <Plus size={13} />
          </button>
          {deletable && (
            <button
              onClick={() => onDelete(col.id)}
              className="text-slate-600 hover:text-red-400 p-1.5 rounded hover:bg-red-400/10 transition"
              title="Delete column"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 min-h-[120px] transition-colors ${
          isOver ? 'bg-brand-accent/5 ring-1 ring-brand-accent/20' : 'bg-app-sidebar/40'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.taskId)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard
              key={task.taskId}
              task={task}
              members={members}
              onClick={() => onTaskClick(task)}
              onStatusChange={onStatusChange}
              onDueDateChange={onDueDateChange}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-slate-700 text-xs">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function AddColumnButton({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef();

  const start = () => {
    setAdding(true);
    setName('');
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setAdding(false);
    setName('');
  };

  const cancel = () => {
    setAdding(false);
    setName('');
  };

  if (!adding) {
    return (
      <button
        onClick={start}
        className="flex-shrink-0 w-[280px] flex items-center gap-2 text-slate-600 hover:text-slate-300 hover:bg-app-sidebar/60 px-3 py-2.5 rounded-xl border border-dashed border-app-border hover:border-slate-600 transition text-sm self-start"
      >
        <Plus size={15} />
        Add column
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-[280px] bg-app-sidebar/40 rounded-xl p-3 self-start">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        onBlur={commit}
        placeholder="Column name…"
        className="w-full bg-app-bg border border-brand-accent rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none mb-2"
      />
      <div className="flex gap-2">
        <button
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="flex items-center gap-1.5 bg-brand-accent text-white text-xs px-3 py-1.5 rounded-lg"
        >
          <Check size={12} /> Add
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="text-slate-500 hover:text-slate-300 p-1.5"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function CompletedSection({ tasks, members, onTaskClick, onRestore }) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  const thisWeekCount = tasks.filter((t) => {
    try { return isThisWeek(new Date(t.updated_at)); } catch { return false; }
  }).length;

  const thisMonthCount = tasks.filter((t) => {
    try { return isThisMonth(new Date(t.updated_at)); } catch { return false; }
  }).length;

  return (
    <div className="mt-8 border-t border-app-border pt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 mb-1 group w-full text-left"
      >
        {open
          ? <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
          : <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
        }
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Completed
        </span>
        <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {tasks.length}
        </span>
        <div className="flex items-center gap-2 ml-2 text-xs text-slate-600">
          <span className="text-emerald-600 font-semibold">{thisWeekCount} this week</span>
          <span>·</span>
          <span>{thisMonthCount} this month</span>
          <span>·</span>
          <span>{tasks.length} total</span>
        </div>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {tasks.map((task) => (
            <div key={task.taskId} className="relative group/done">
              <TaskCard
                task={task}
                members={members}
                onClick={() => onTaskClick(task)}
                onStatusChange={onRestore}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onRestore(task.taskId, 'todo'); }}
                className="absolute top-2 right-2 opacity-0 group-hover/done:opacity-100 flex items-center gap-1 text-xs bg-app-bg hover:bg-app-card text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-full transition border border-app-border shadow-sm"
                title="Restore task"
              >
                <RotateCcw size={10} />
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  groups,
  members,
  onTaskClick,
  onStatusChange,
  onDueDateChange,
  onAddTask,
  onColumnChange,
  onGroupCreate,
  onGroupUpdate,
  onGroupDelete,
}) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  // Build group → tasks mapping
  const tasksByGroup = {};
  groups.forEach((g) => { tasksByGroup[g.groupId] = []; });
  tasksByGroup['__none__'] = [];

  activeTasks.forEach((t) => {
    const key = t.group_id && tasksByGroup[t.group_id] !== undefined
      ? t.group_id
      : '__none__';
    tasksByGroup[key].push(t);
  });

  const findGroupId = (taskId) => {
    for (const [gid, list] of Object.entries(tasksByGroup)) {
      if (list.some((t) => t.taskId === taskId)) return gid;
    }
    return null;
  };

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t.taskId === active.id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const targetId = over.id;
    const newGroupId = targetId === '__none__' ? null : groups.find((g) => g.groupId === targetId)?.groupId ?? null;
    const currentGroupId = (() => {
      const raw = findGroupId(active.id);
      return raw === '__none__' ? null : raw;
    })();

    if (newGroupId !== currentGroupId) {
      onColumnChange(active.id, newGroupId);
    }
  };

  const unsectionedTasks = tasksByGroup['__none__'];

  return (
    <div className="flex flex-col h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 items-start flex-wrap">
          {/* Unsectioned column – shown only when tasks exist without a group */}
          {unsectionedTasks.length > 0 && (
            <Column
              col={{ id: '__none__', name: 'Unsectioned' }}
              tasks={unsectionedTasks}
              members={members}
              colorIndex={-1}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onStatusChange={onStatusChange}
              onDueDateChange={onDueDateChange}
              onRename={() => {}}
              onDelete={() => {}}
              deletable={false}
            />
          )}

          {groups.map((g, idx) => (
            <Column
              key={g.groupId}
              col={{ id: g.groupId, name: g.name }}
              tasks={tasksByGroup[g.groupId] || []}
              members={members}
              colorIndex={idx}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onStatusChange={onStatusChange}
              onDueDateChange={onDueDateChange}
              onRename={onGroupUpdate}
              onDelete={onGroupDelete}
              deletable
            />
          ))}

          <AddColumnButton onAdd={onGroupCreate} />
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} members={members} dragging />}
        </DragOverlay>
      </DndContext>

      <CompletedSection
        tasks={doneTasks}
        members={members}
        onTaskClick={onTaskClick}
        onRestore={onStatusChange}
      />
    </div>
  );
}
