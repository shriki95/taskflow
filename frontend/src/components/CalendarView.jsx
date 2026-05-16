import { useState, useRef, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addMonths, subMonths, addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { isRTL } from '../utils/text';

const PRIORITY_BAR    = { high: 'bg-red-500',    medium: 'bg-amber-500',    low: 'bg-emerald-500' };
const PRIORITY_BORDER = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-emerald-500' };
const PRIORITY_BG     = { high: 'bg-red-500/5',  medium: 'bg-amber-500/5',  low: 'bg-emerald-500/5' };

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

function TaskChip({ task, onClick, onStatusChange }) {
  const isDone = task.status === 'done';
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(task); }}
      className={`flex items-start gap-1 px-1 py-0.5 rounded text-xs cursor-pointer
        hover:opacity-80 transition mb-0.5
        ${isDone ? 'opacity-50' : ''}
        bg-app-sidebar border border-app-border`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (onStatusChange) onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
        className="flex-shrink-0 focus:outline-none mt-0.5"
      >
        {isDone
          ? <CheckCircle2 size={10} className="text-emerald-400" />
          : <Circle size={10} className="text-slate-600 hover:text-slate-400 transition-colors" />}
      </button>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${PRIORITY_BAR[task.priority] || 'bg-slate-500'}`} />
      <span
        dir={isRTL(task.title) ? 'rtl' : 'ltr'}
        className={`flex-1 leading-snug break-words min-w-0 ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}
      >
        {task.title}
      </span>
    </div>
  );
}

export default function CalendarView({ tasks, members, onTaskClick, onStatusChange, onDayClick }) {
  const [current, setCurrent] = useState(new Date());
  const [popover, setPopover]  = useState(null);
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

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        <div className="border border-app-border rounded-xl overflow-hidden">
          {weeks.map((weekDays, wIdx) => {
            const weekLayout  = computeWeekSpanLayout(multiDaySpans, weekDays);
            const numSpanRows = weekLayout.reduce((max, { row }) => Math.max(max, row + 1), 0);

            // Single CSS grid per week row:
            // row 1           → date numbers (28px)
            // rows 2..N+1     → spanning bars (SPAN_BAR_H px each, only when N > 0)
            // last row        → single-day chips (auto height)
            const DATE_ROW  = 1;
            const CHIP_ROW  = numSpanRows + 2;
            const rowTemplate = `28px ${numSpanRows > 0 ? `repeat(${numSpanRows}, ${SPAN_BAR_H}px) ` : ''}88px`;

            return (
              <div
                key={wIdx}
                className={`grid grid-cols-7 ${wIdx > 0 ? 'border-t border-app-border' : ''}`}
                style={{ gridTemplateRows: rowTemplate }}
              >
                {/* Date numbers */}
                {weekDays.map((day, col) => {
                  const inMonth   = isSameMonth(day, current);
                  const todayFlag = isToday(day);
                  return (
                    <div
                      key={`d-${day.toISOString()}`}
                      style={{ gridColumn: col + 1, gridRow: DATE_ROW }}
                      onClick={() => onDayClick && onDayClick(day)}
                      className={`flex items-center justify-end px-1.5 pt-1 pb-0 cursor-pointer
                        bg-app-card
                        ${col > 0 ? 'border-l border-app-border' : ''}
                        border-b border-app-border
                        ${inMonth ? '' : 'opacity-40'}
                        ${todayFlag ? '!bg-brand-accent/20' : ''}`}
                    >
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                        ${todayFlag ? 'bg-brand-accent text-white' : 'text-slate-400'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}

                {/* Spanning bars — placed between date row and chip row */}
                {weekLayout.map(({ task, startCol, endCol, row, startsThisWeek, endsThisWeek }) => {
                  const isDone = task.status === 'done';
                  return (
                    <div
                      key={`s-${task.taskId}-w${wIdx}`}
                      onClick={() => onTaskClick(task)}
                      style={{ gridColumn: `${startCol + 1} / ${endCol + 2}`, gridRow: row + 2, background: 'transparent' }}
                      className={`flex items-center gap-1 px-1.5 mx-0.5 my-0.5 rounded text-xs
                        cursor-pointer hover:opacity-80 transition border-l-2
                        bg-app-sidebar border border-app-border
                        ${PRIORITY_BORDER[task.priority] || 'border-l-slate-500'}
                        ${PRIORITY_BG[task.priority] || ''}
                        ${isDone ? 'opacity-50' : ''}`}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(task.taskId, isDone ? 'todo' : 'done'); }}
                        className="flex-shrink-0 focus:outline-none"
                      >
                        {isDone ? <CheckCircle2 size={9} className="text-emerald-400" /> : <Circle size={9} className="text-slate-600" />}
                      </button>
                      {!startsThisWeek && <span className="opacity-40 text-[8px] flex-shrink-0">◀</span>}
                      <span
                        dir={isRTL(task.title) ? 'rtl' : 'ltr'}
                        className={`flex-1 text-xs font-medium leading-snug truncate min-w-0 ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
                      >
                        {task.title}
                      </span>
                      {!endsThisWeek && <span className="opacity-40 text-[8px] flex-shrink-0">▶</span>}
                    </div>
                  );
                })}

                {/* Single-day chips */}
                {weekDays.map((day, col) => {
                  const singleTasks = singleTasksForDay(day);
                  const inMonth     = isSameMonth(day, current);
                  const todayFlag   = isToday(day);
                  const isoDay      = day.toISOString();
                  const visible     = singleTasks.slice(0, 3);
                  const overflow    = singleTasks.length - 3;
                  return (
                    <div
                      key={`c-${isoDay}`}
                      style={{ gridColumn: col + 1, gridRow: CHIP_ROW }}
                      onClick={() => onDayClick && onDayClick(day)}
                      className={`p-1 cursor-pointer overflow-hidden
                        bg-app-bg
                        ${col > 0 ? 'border-l border-app-border' : ''}
                        ${inMonth ? '' : 'opacity-40'}
                        ${todayFlag ? '!bg-brand-accent/5' : 'hover:bg-app-card/40'}`}
                    >
                      {visible.map((task) => (
                        <TaskChip key={`${task.taskId}-${isoDay}`} task={task} onClick={onTaskClick} onStatusChange={onStatusChange} />
                      ))}
                      {overflow > 0 && (
                        <button
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={(e) => showPopover(e, isoDay)}
                          onMouseLeave={startHide}
                          className="text-xs text-slate-500 hover:text-slate-300 pl-1 transition"
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
