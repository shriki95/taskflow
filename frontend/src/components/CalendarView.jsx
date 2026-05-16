import { useState, useRef, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { isRTL } from '../utils/text';
import { getHolidaysForDate, HOLIDAY_STYLE } from '../utils/israeliHolidays';

const PRIORITY_BAR = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };

const SPAN_BAR_H = 22;

function getTaskSpan(task) {
  if (!task.due_date) return [];
  const start = new Date(task.due_date);
  if (!task.span_days || task.span_days <= 1) return [start];
  return Array.from({ length: task.span_days }, (_, i) => addDays(start, i));
}

const isSpanTask = (task) => task.span_days && task.span_days >= 2;

function computeWeekSpanLayout(multiDaySpans, weekDays) {
  const positioned = [];
  for (const { task, span } of multiDaySpans) {
    const startCol = weekDays.findIndex((d) => span.some((s) => isSameDay(s, d)));
    if (startCol === -1) continue;
    let endCol = -1;
    for (let i = weekDays.length - 1; i >= 0; i--) {
      if (span.some((s) => isSameDay(s, weekDays[i]))) { endCol = i; break; }
    }
    if (endCol === -1) continue;
    const startsThisWeek = isSameDay(span[0], weekDays[startCol]);
    const endsThisWeek   = isSameDay(span[span.length - 1], weekDays[endCol]);
    let row = 0;
    while (positioned.some((p) => p.row === row && p.startCol <= endCol && p.endCol >= startCol)) row++;
    positioned.push({ task, startCol, endCol, row, startsThisWeek, endsThisWeek });
  }
  return positioned;
}

function TaskChip({ task, onClick, onStatusChange, compact = false }) {
  const isDone = task.status === 'done';
  const iconSize = compact ? 8 : 10;
  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('taskId', task.taskId); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      className={`flex items-center gap-0.5 px-1 rounded cursor-grab active:cursor-grabbing
        hover:opacity-80 transition
        ${compact ? 'py-px mb-px text-[9px]' : 'py-0.5 mb-0.5 text-xs'}
        ${isDone ? 'opacity-50' : ''}
        bg-app-sidebar border border-app-border`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (onStatusChange) onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
        className="flex-shrink-0 focus:outline-none"
      >
        {isDone
          ? <CheckCircle2 size={iconSize} className="text-emerald-400" />
          : <Circle size={iconSize} className="text-slate-600 hover:text-slate-400 transition-colors" />}
      </button>
      <span className={`rounded-full flex-shrink-0 ${PRIORITY_BAR[task.priority] || 'bg-slate-500'} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
      <span
        dir={isRTL(task.title) ? 'rtl' : 'ltr'}
        className={`flex-1 leading-none truncate min-w-0 ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}
      >
        {task.title}
      </span>
    </div>
  );
}

function SpanChip({ task, onTaskClick, onStatusChange, startsThisWeek, endsThisWeek, compact = false }) {
  const isDone = task.status === 'done';
  const iconSize = compact ? 8 : 10;
  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('taskId', task.taskId); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
      className={`flex items-center gap-0.5 px-1 rounded cursor-grab active:cursor-grabbing
        hover:opacity-80 transition h-full
        ${compact ? 'text-[9px]' : 'text-xs'}
        ${isDone ? 'opacity-50' : ''}
        bg-app-sidebar border border-app-border`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
        className="flex-shrink-0 focus:outline-none"
      >
        {isDone
          ? <CheckCircle2 size={iconSize} className="text-emerald-400" />
          : <Circle size={iconSize} className="text-slate-600 hover:text-slate-400 transition-colors" />}
      </button>
      {!startsThisWeek && <span className="opacity-40 text-[8px] flex-shrink-0">◀</span>}
      <span className={`rounded-full flex-shrink-0 ${PRIORITY_BAR[task.priority] || 'bg-slate-500'} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
      <span
        dir={isRTL(task.title) ? 'rtl' : 'ltr'}
        className={`flex-1 leading-none truncate min-w-0 ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}
      >
        {task.title}
      </span>
      {!endsThisWeek && <span className="opacity-40 text-[8px] flex-shrink-0">▶</span>}
    </div>
  );
}

export default function CalendarView({ tasks, members, onTaskClick, onStatusChange, onDayClick, onDueDateChange, showHolidays, onToggleHolidays }) {
  const [current, setCurrent]   = useState(new Date());
  const [popover, setPopover]   = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const hideTimer = useRef(null);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 0 });
  const allDays    = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  const taskSpans     = tasks.filter((t) => t.due_date).map((t) => ({ task: t, span: getTaskSpan(t) }));
  const multiDaySpans = taskSpans.filter(({ task }) => isSpanTask(task));

  const singleTasksForDay = (day) =>
    taskSpans
      .filter(({ task, span }) => !isSpanTask(task) && span.some((d) => isSameDay(d, day)))
      .map(({ task }) => task);

  const showPopover = useCallback((e, isoDay) => {
    clearTimeout(hideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ isoDay, top: rect.top, left: rect.left + rect.width + 6 });
  }, []);
  const startHide  = useCallback(() => { hideTimer.current = setTimeout(() => setPopover(null), 120); }, []);
  const cancelHide = useCallback(() => { clearTimeout(hideTimer.current); }, []);

  const handleDrop = useCallback((e, day) => {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDueDateChange) {
      onDueDateChange(taskId, format(day, 'yyyy-MM-dd'));
    }
  }, [onDueDateChange]);

  const WEEKDAYS       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WEEKDAYS_SHORT = ['S',   'M',   'T',   'W',   'T',   'F',   'S'  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-100">{format(current, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent((d) => subMonths(d, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setCurrent(new Date())} className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition border border-app-border">
            Today
          </button>
          <button onClick={() => setCurrent((d) => addMonths(d, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-app-sidebar transition">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={onToggleHolidays}
            title="חגי ישראל"
            className={`px-2 py-1 text-xs font-medium rounded-lg border transition ${
              showHolidays
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'text-slate-500 hover:text-slate-300 hover:bg-app-sidebar border-app-border'
            }`}
          >
            🇮🇱
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
       <div>
        {/* Day-of-week headers */}
        <div className="grid mb-1" style={{ gridTemplateColumns: 'repeat(7, minmax(44px, 1fr))' }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-1">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
            </div>
          ))}
        </div>

        <div className="border border-app-border rounded-xl overflow-hidden bg-app-bg">
          {weeks.map((weekDays, wIdx) => {
            const weekLayout  = computeWeekSpanLayout(multiDaySpans, weekDays);
            const numSpanRows = weekLayout.reduce((max, { row }) => Math.max(max, row + 1), 0);

            const DATE_ROW    = 1;
            const CHIP_ROW    = numSpanRows + 2;
            const rowTemplate = `28px ${numSpanRows > 0 ? `repeat(${numSpanRows}, ${SPAN_BAR_H}px) ` : ''}88px`;

            return (
              <div
                key={wIdx}
                className={`grid ${wIdx > 0 ? 'border-t border-app-border' : ''}`}
                style={{ gridTemplateColumns: 'repeat(7, minmax(44px, 1fr))', gridTemplateRows: rowTemplate }}
              >
                {/* Date numbers */}
                {weekDays.map((day, col) => {
                  const inMonth   = isSameMonth(day, current);
                  const todayFlag = isToday(day);
                  const holidays  = showHolidays ? getHolidaysForDate(day) : [];
                  const mainHol   = holidays[0];
                  const holStyle  = mainHol ? HOLIDAY_STYLE[mainHol.type] : null;
                  return (
                    <div
                      key={`d-${day.toISOString()}`}
                      style={{ gridColumn: col + 1, gridRow: DATE_ROW }}
                      onClick={() => onDayClick && onDayClick(day)}
                      className={`flex items-center justify-between px-1 pt-1 pb-0 cursor-pointer
                        bg-app-card
                        ${col > 0 ? 'border-l border-app-border' : ''}
                        border-b border-app-border
                        ${inMonth ? '' : 'opacity-40'}
                        ${todayFlag ? '!bg-brand-accent/20' : ''}`}
                    >
                      {mainHol ? (
                        <span className={`text-[8px] font-medium truncate leading-none px-0.5 ${holStyle.text}`} dir="rtl">
                          {mainHol.name}
                        </span>
                      ) : <span />}
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0
                        ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-400'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}

                {/* Spanning bars */}
                {weekLayout.map(({ task, startCol, endCol, row, startsThisWeek, endsThisWeek }) => (
                  <div
                    key={`s-${task.taskId}-w${wIdx}`}
                    style={{ gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: row + 2 }}
                    className="px-0.5 py-0.5"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => handleDrop(e, weekDays[startCol])}
                  >
                    <SpanChip
                      task={task}
                      onTaskClick={onTaskClick}
                      onStatusChange={onStatusChange}
                      startsThisWeek={startsThisWeek}
                      endsThisWeek={endsThisWeek}
                    />
                  </div>
                ))}

                {/* Single-day chips */}
                {weekDays.map((day, col) => {
                  const singleTasks = singleTasksForDay(day);
                  const inMonth     = isSameMonth(day, current);
                  const todayFlag   = isToday(day);
                  const isoDay      = day.toISOString();
                  const count       = singleTasks.length;
                  const compact     = count >= 4;
                  const maxVisible  = count <= 3 ? 3 : count <= 5 ? 5 : 4;
                  const visible     = singleTasks.slice(0, maxVisible);
                  const overflow    = singleTasks.length - maxVisible;
                  const isOver      = dragOver === isoDay;
                  return (
                    <div
                      key={`c-${isoDay}`}
                      style={{ gridColumn: col + 1, gridRow: CHIP_ROW }}
                      onClick={() => onDayClick && onDayClick(day)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(isoDay); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleDrop(e, day)}
                      className={`p-1 cursor-pointer overflow-hidden transition-colors
                        ${col > 0 ? 'border-l border-app-border' : ''}
                        ${inMonth ? '' : 'opacity-40'}
                        ${isOver ? 'bg-brand-accent/10' : todayFlag ? '!bg-brand-accent/5' : 'bg-app-bg hover:bg-app-card/40'}`}
                    >
                      {visible.map((task) => (
                        <TaskChip key={`${task.taskId}-${isoDay}`} task={task} onClick={onTaskClick} onStatusChange={onStatusChange} compact={compact} />
                      ))}
                      {overflow > 0 && (
                        <button
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={(e) => showPopover(e, isoDay)}
                          onMouseLeave={startHide}
                          className="text-[10px] text-slate-500 hover:text-slate-300 pl-1 transition leading-none"
                        >
                          +{overflow} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
       </div>
      </div>

      {/* Overflow popover */}
      {popover && (() => {
        const popDay = allDays.find((d) => d.toISOString() === popover.isoDay);
        if (!popDay) return null;
        const allTasks = singleTasksForDay(popDay);
        return (
          <div
            className="fixed z-50 bg-app-card border border-app-border rounded-xl shadow-2xl p-2 w-60 max-h-72 overflow-y-auto"
            style={{ top: Math.min(popover.top, window.innerHeight - 300), left: Math.min(popover.left, window.innerWidth - 260) }}
            onMouseEnter={cancelHide}
            onMouseLeave={startHide}
          >
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              {format(popDay, 'MMM d')} · {allTasks.length} tasks
            </p>
            {allTasks.map((task) => (
              <TaskChip
                key={`pop-${task.taskId}`}
                task={task}
                onClick={(t) => { setPopover(null); onTaskClick(t); }}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
