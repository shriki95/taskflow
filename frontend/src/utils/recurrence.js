import { isSameDay, differenceInCalendarDays, differenceInCalendarWeeks, differenceInCalendarMonths, differenceInCalendarYears, getDay } from 'date-fns';

// recurrence_rule shape: { freq: 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' }

export const RECURRENCE_OPTIONS = [
  { value: null,        label: 'Does not repeat' },
  { value: 'daily',     label: 'Every day' },
  { value: 'weekdays',  label: 'Every weekday (Mon–Fri)' },
  { value: 'weekly',    label: 'Every week' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Every month' },
  { value: 'yearly',    label: 'Every year' },
];

export function taskOccursOnDay(task, day) {
  if (!task.due_date) return false;
  const start = new Date(task.due_date);
  start.setHours(0, 0, 0, 0);
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);

  if (d < start) return false;
  if (isSameDay(start, d)) return true;

  const rule = task.recurrence_rule;
  if (!rule?.freq) return false;

  const { freq } = rule;
  const dayOfWeek = getDay(d); // 0=Sun, 6=Sat

  switch (freq) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekly':
      return differenceInCalendarDays(d, start) % 7 === 0;
    case 'biweekly':
      return differenceInCalendarWeeks(d, start) % 2 === 0 &&
             differenceInCalendarDays(d, start) % 7 === 0;
    case 'monthly':
      return d.getDate() === start.getDate();
    case 'yearly':
      return d.getDate() === start.getDate() && d.getMonth() === start.getMonth();
    default:
      return false;
  }
}
