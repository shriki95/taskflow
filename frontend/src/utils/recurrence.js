import { addDays, addWeeks, addMonths, addYears, getDay, isSameDay } from 'date-fns';

// recurrence_rule shape: { freq: 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' }

export const RECURRENCE_OPTIONS = [
  { value: null,        label: 'Does not repeat' },
  { value: 'daily',     label: 'Every day' },
  { value: 'weekdays',  label: 'Every weekday (Sun–Thu)' },
  { value: 'weekly',    label: 'Every week' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Every month' },
  { value: 'yearly',    label: 'Every year' },
];

// Returns array of Date objects for all occurrences starting from startDate
// for the next `days` calendar days (default 90).
export function generateOccurrenceDates(startDate, freq, days = 90) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, days);
  const dates = [];

  switch (freq) {
    case 'daily': {
      let d = new Date(start);
      while (d <= end) { dates.push(new Date(d)); d = addDays(d, 1); }
      break;
    }
    case 'weekdays': {
      let d = new Date(start);
      while (d <= end) {
        const dow = getDay(d); // 0=Sun … 6=Sat
        if (dow >= 0 && dow <= 4) dates.push(new Date(d)); // Sun–Thu
        d = addDays(d, 1);
      }
      break;
    }
    case 'weekly': {
      let d = new Date(start);
      while (d <= end) { dates.push(new Date(d)); d = addWeeks(d, 1); }
      break;
    }
    case 'biweekly': {
      let d = new Date(start);
      while (d <= end) { dates.push(new Date(d)); d = addWeeks(d, 2); }
      break;
    }
    case 'monthly': {
      let d = new Date(start);
      while (d <= end) { dates.push(new Date(d)); d = addMonths(d, 1); }
      break;
    }
    case 'yearly': {
      let d = new Date(start);
      while (d <= end) { dates.push(new Date(d)); d = addYears(d, 1); }
      break;
    }
    default:
      break;
  }

  return dates;
}

// Legacy helper kept for any remaining callers — will be removed once views are updated.
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
  return generateOccurrenceDates(start, rule.freq, 3660).some((od) => isSameDay(od, d));
}
