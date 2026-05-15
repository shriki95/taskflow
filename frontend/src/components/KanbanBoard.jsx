import { useState } from 'react';
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
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const COLUMNS = [
  { id: 'todo', label: 'To Do', dot: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-500' },
];

function SortableCard({ task, members, onClick, onStatusChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.taskId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} members={members} onClick={onClick} onStatusChange={onStatusChange} />
    </div>
  );
}

function Column({ col, tasks, members, onTaskClick, onAddTask, onStatusChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex-1 min-w-[260px] max-w-[310px] flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {col.label}
          </h3>
          <span className="text-xs text-slate-600 bg-app-card border border-app-border rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(col.id)}
          className="text-slate-600 hover:text-slate-300 p-1 rounded hover:bg-app-card transition"
          title={`Add task to ${col.label}`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 min-h-[120px] transition-colors ${
          isOver ? 'bg-brand-accent/5 ring-1 ring-brand-accent/20' : 'bg-app-sidebar/40'
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.taskId)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableCard
              key={task.taskId}
              task={task}
              members={members}
              onClick={() => onTaskClick(task)}
              onStatusChange={onStatusChange}
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

export default function KanbanBoard({ tasks, members, onTaskClick, onStatusChange, onAddTask }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  const findTaskStatus = (taskId) => {
    for (const [status, list] of Object.entries(tasksByStatus)) {
      if (list.find((t) => t.taskId === taskId)) return status;
    }
    return null;
  };

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t.taskId === active.id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;
    const newStatus = COLUMNS.find((c) => c.id === over.id)?.id;
    if (newStatus && newStatus !== findTaskStatus(active.id)) {
      onStatusChange(active.id, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 h-full">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            col={col}
            tasks={tasksByStatus[col.id]}
            members={members}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} members={members} dragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}
