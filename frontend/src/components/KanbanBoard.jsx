import { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Check, X, Trash2, ChevronDown, ChevronRight, RotateCcw, GripVertical, RefreshCw } from 'lucide-react';
import { isThisWeek, isThisMonth } from 'date-fns';
import TaskCard from './TaskCard';

const COL_COLORS = [
  '#64748b', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#10b981', '#ef4444', '#06b6d4',
];

// Prefix used to distinguish column sortable IDs from task IDs
const COL_PREFIX = 'col-';

function SortableCard({ task, members, onClick, onStatusChange, onDueDateChange, groups, onDelete, onMoveToGroup, onDuplicate, density }) {
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
        groups={groups}
        onDelete={onDelete}
        onMoveToGroup={onMoveToGroup}
        onDuplicate={onDuplicate}
        density={density}
      />
    </div>
  );
}

function Column({
  col, tasks, members, colorIndex, onTaskClick, onAddTask, onStatusChange, onDueDateChange,
  onRename, onDelete, editable, deletable, dragHandleProps,
  groups, onTaskDelete, onTaskMoveToGroup, onTaskDuplicate, density,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(col.name);
  const inputRef = useRef();
  const color = colorIndex < 0 ? '#475569' : COL_COLORS[colorIndex % COL_COLORS.length];

  const startEdit = () => {
    if (!editable) return;
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
    <div className="flex-shrink-0 w-full sm:w-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1 group/header">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="flex-shrink-0 text-slate-700 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 transition touch-none p-0.5"
              title="Drag to reorder"
            >
              <GripVertical size={12} />
            </button>
          )}
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
          ) : editable ? (
            <button
              onClick={startEdit}
              className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate hover:text-slate-200 transition text-left"
              title="Click to rename"
            >
              {col.name}
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate italic">
              {col.name}
            </span>
          )}
          <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5 py-0.5 min-w-[20px] text-center flex-shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition">
          <button
            onClick={() => onAddTask(col.id === '__none__' ? {} : { groupId: col.id })}
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
              groups={groups}
              onDelete={onTaskDelete}
              onMoveToGroup={onTaskMoveToGroup}
              onDuplicate={onTaskDuplicate}
              density={density}
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

function SortableColumn(props) {
  const { col } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `${COL_PREFIX}${col.id}` });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <Column {...props} dragHandleProps={{ ...attributes, ...listeners }} />
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
        className="flex-shrink-0 w-full sm:w-[280px] flex items-center gap-2 text-slate-600 hover:text-slate-300 hover:bg-app-sidebar/60 px-3 py-2.5 rounded-xl border border-dashed border-app-border hover:border-slate-600 transition text-sm self-start"
      >
        <Plus size={15} />
        Add column
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-full sm:w-[280px] bg-app-sidebar/40 rounded-xl p-3 self-start">
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

function ColumnDragOverlay({ col, colorIndex }) {
  const color = colorIndex < 0 ? '#475569' : COL_COLORS[colorIndex % COL_COLORS.length];
  return (
    <div className="w-full sm:w-[280px] bg-app-card border border-brand-accent/50 rounded-xl p-3 shadow-2xl opacity-90 rotate-1">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{col.name}</span>
      </div>
    </div>
  );
}

function CompletedSection({ tasks, members, onTaskClick, onRestore, density, recurringDoneCounts = {} }) {
  const [open, setOpen] = useState(false);

  const thisWeekCount = tasks.filter((t) => {
    try { return isThisWeek(new Date(t.updated_at)); } catch { return false; }
  }).length;

  const thisMonthCount = tasks.filter((t) => {
    try { return isThisMonth(new Date(t.updated_at)); } catch { return false; }
  }).length;

  return (
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-app-border" />
        <span className="text-xs text-slate-700 uppercase tracking-widest font-semibold">History</span>
        <div className="flex-1 h-px bg-app-border" />
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition group ${
          open
            ? 'bg-app-card border-app-border'
            : 'bg-app-sidebar/30 border-app-border hover:border-slate-600 hover:bg-app-sidebar/60'
        }`}
      >
        {open
          ? <ChevronDown size={14} className="text-emerald-500 flex-shrink-0" />
          : <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition" />
        }
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Completed tasks
        </span>
        <span className={`text-xs rounded-full px-2 py-0.5 font-semibold border ${
          tasks.length > 0
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-app-bg border-app-border text-slate-600'
        }`}>
          {tasks.length}
        </span>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2 ml-auto text-xs text-slate-600">
            <span className="text-emerald-600 font-medium">{thisWeekCount} this week</span>
            <span>·</span>
            <span>{thisMonthCount} this month</span>
            <span>·</span>
            <span>{tasks.length} total</span>
          </div>
        )}
        {tasks.length === 0 && (
          <span className="ml-auto text-xs text-slate-700 italic">No completed tasks yet</span>
        )}
      </button>

      {open && tasks.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {tasks.map((task) => {
            const doneCount = recurringDoneCounts[task.taskId] || 0;
            const isRecurringSeries = doneCount > 0;
            return (
              <div key={task.taskId} className="relative group/done">
                <TaskCard
                  task={task}
                  members={members}
                  onClick={() => onTaskClick(task)}
                  onStatusChange={onRestore}
                  density={density}
                />
                {isRecurringSeries && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 text-xs bg-brand-accent/15 border border-brand-accent/30 text-brand-accent px-1.5 py-0.5 rounded-full font-semibold pointer-events-none">
                    <RefreshCw size={9} />
                    {doneCount}×
                  </div>
                )}
                {!isRecurringSeries && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRestore(task.taskId, 'todo'); }}
                    className="absolute top-2 right-2 opacity-0 group-hover/done:opacity-100 flex items-center gap-1 text-xs bg-app-bg hover:bg-app-card text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-full transition border border-app-border shadow-sm"
                    title="Restore task"
                  >
                    <RotateCcw size={10} />
                    Restore
                  </button>
                )}
              </div>
            );
          })}
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
  onGroupReorder,
  onTaskDelete,
  onTaskDuplicate,
  onTasksReorder,
  density = 'comfortable',
  recurringDoneCounts = {},
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const activeDragTypeRef = useRef(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } })
  );

  // Recurring series masters with ≥1 completed instance appear in Completed, not Active
  const activeTasks = tasks.filter((t) => t.status !== 'done' && !(recurringDoneCounts[t.taskId] > 0));
  const doneTasks   = tasks.filter((t) => t.status === 'done' || recurringDoneCounts[t.taskId] > 0);

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

  const collisionDetection = useCallback((args) => {
    if (activeDragTypeRef.current === 'column') {
      const colContainers = args.droppableContainers.filter(
        (c) => String(c.id).startsWith(COL_PREFIX)
      );
      if (colContainers.length > 0) {
        return closestCenter({ ...args, droppableContainers: colContainers });
      }
      return [];
    }
    // Task drag: exclude col-* containers
    const taskContainers = args.droppableContainers.filter(
      (c) => !String(c.id).startsWith(COL_PREFIX)
    );
    return closestCenter({ ...args, droppableContainers: taskContainers });
  }, []);

  const handleDragStart = ({ active }) => {
    const isCol = String(active.id).startsWith(COL_PREFIX);
    activeDragTypeRef.current = isCol ? 'column' : 'task';
    if (isCol) {
      const groupId = String(active.id).slice(COL_PREFIX.length);
      setActiveColumn(groups.find((g) => g.groupId === groupId) || null);
    } else {
      setActiveTask(tasks.find((t) => t.taskId === active.id) || null);
    }
  };

  const handleDragEnd = ({ active, over }) => {
    if (activeDragTypeRef.current === 'column') {
      activeDragTypeRef.current = null;
      setActiveColumn(null);
      if (!over || active.id === over.id) return;
      const groupId = String(active.id).slice(COL_PREFIX.length);
      const overGroupId = String(over.id).slice(COL_PREFIX.length);
      const oldIdx = groups.findIndex((g) => g.groupId === groupId);
      const newIdx = groups.findIndex((g) => g.groupId === overGroupId);
      if (oldIdx !== -1 && newIdx !== -1 && onGroupReorder) {
        onGroupReorder(arrayMove(groups, oldIdx, newIdx));
      }
      return;
    }

    activeDragTypeRef.current = null;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const targetId = over.id;
    const activeId = active.id;

    const currentGroupRaw = findGroupId(activeId);
    const currentGroupId = currentGroupRaw === '__none__' ? null : currentGroupRaw;

    // Determine target group: could be a column droppable or another task
    let newGroupRaw;
    if (targetId === '__none__' || groups.some((g) => g.groupId === targetId)) {
      newGroupRaw = targetId;
    } else {
      newGroupRaw = findGroupId(targetId);
    }
    const newGroupId = newGroupRaw === '__none__' ? null : newGroupRaw;

    if (newGroupId !== currentGroupId) {
      onColumnChange(activeId, newGroupId);
    } else {
      // Same column — reorder
      const colKey = currentGroupRaw || '__none__';
      const colTasks = tasksByGroup[colKey] || [];
      const oldIdx = colTasks.findIndex((t) => t.taskId === activeId);
      const newIdx = colTasks.findIndex((t) => t.taskId === targetId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx && onTasksReorder) {
        onTasksReorder(arrayMove(colTasks, oldIdx, newIdx).map((t) => t.taskId));
      }
    }
  };

  const unsectionedTasks = tasksByGroup['__none__'];

  return (
    <div className="flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:flex-wrap">
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
              editable={false}
              deletable={false}
              groups={groups}
              onTaskDelete={onTaskDelete}
              onTaskMoveToGroup={onColumnChange}
              onTaskDuplicate={onTaskDuplicate}
              density={density}
            />
          )}

          <SortableContext
            items={groups.map((g) => `${COL_PREFIX}${g.groupId}`)}
            strategy={rectSortingStrategy}
          >
            {groups.map((g, idx) => (
              <SortableColumn
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
                editable
                deletable
                groups={groups}
                onTaskDelete={onTaskDelete}
                onTaskMoveToGroup={onColumnChange}
                onTaskDuplicate={onTaskDuplicate}
                density={density}
              />
            ))}
          </SortableContext>

          <AddColumnButton onAdd={onGroupCreate} />
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} members={members} dragging />}
          {activeColumn && (
            <ColumnDragOverlay
              col={activeColumn}
              colorIndex={groups.findIndex((g) => g.groupId === activeColumn.groupId)}
            />
          )}
        </DragOverlay>
      </DndContext>

      <CompletedSection
        tasks={doneTasks}
        members={members}
        onTaskClick={onTaskClick}
        onRestore={onStatusChange}
        density={density}
        recurringDoneCounts={recurringDoneCounts}
      />
    </div>
  );
}
