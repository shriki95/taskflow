// Detects Hebrew/Arabic characters for RTL direction
export const isRTL = (text) =>
  /[֐-׿؀-ۿיִ-﷿ﹰ-﻿]/.test(text || '');

// Format duration_minutes to human-readable string
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days}d`;
  }
  if (minutes >= 60) {
    const hours = minutes % 60 === 0 ? minutes / 60 : (minutes / 60).toFixed(1);
    return `${hours}h`;
  }
  return `${minutes}m`;
};

// Parse a user input string like "2h", "30m", "3d" into minutes
export const parseDuration = (value, unit) => {
  const n = parseFloat(value);
  if (!n || isNaN(n) || n <= 0) return null;
  if (unit === 'days')    return Math.round(n * 1440);
  if (unit === 'hours')   return Math.round(n * 60);
  if (unit === 'minutes') return Math.round(n);
  return null;
};
