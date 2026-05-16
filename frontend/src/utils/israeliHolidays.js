import { HebrewCalendar, flags } from '@hebcal/core';

// Strip Hebrew vowel marks (nikud)
function stripNikud(str) {
  return str.replace(/[ְ-ׇװ-״יִ-ﭏ]/g, '').trim();
}

// Simplify multi-part holiday names (e.g. "חנוכה: א׳ נר" → "חנוכה")
function simplifyName(raw) {
  const s = stripNikud(raw);
  if (s.includes('חנוכה'))  return 'חנוכה';
  if (s.includes('פסח') && (s.includes('חוה"מ') || s.includes('חוה״מ'))) return 'חול המועד פסח';
  if (s.includes('סוכות') && (s.includes('חוה"מ') || s.includes('חוה״מ'))) return 'חול המועד סוכות';
  // Strip trailing ordinal (א׳, ב׳ ...) and parenthetical
  return s.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+[א-ת]׳?$/, '').trim();
}

function getType(f, name) {
  if (f & flags.CHOL_HAMOED) return 'minor';
  if (f & flags.CHAG)        return 'holiday';
  if (f & flags.MODERN_HOLIDAY) {
    const n = stripNikud(name);
    if (n.includes('זיכרון') || n.includes('שואה') || n.includes('תשעה') || n.includes('ט׳ באב')) return 'memorial';
    return 'national';
  }
  return 'minor';
}

// Relevant flag bitmask — skip Rosh Chodesh, Shabbat specials, etc.
const WANT = flags.CHAG | flags.MINOR_HOLIDAY | flags.MODERN_HOLIDAY | flags.CHOL_HAMOED;
const SKIP = flags.ROSH_CHODESH | flags.SPECIAL_SHABBAT | flags.SHABBAT_MEVARCHIM;

// Cache computed holidays by Gregorian year
const cache = {};

function buildYear(year) {
  if (cache[year]) return cache[year];
  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
    candlelighting: false,
    sedrot: false,
    omer: false,
    shabbatMevarchim: false,
    molad: false,
    yomKippurKatan: false,
  });

  const map = {};
  for (const ev of events) {
    const f = ev.getFlags();
    if (!(f & WANT)) continue;
    if (f & SKIP)    continue;

    const dateStr = ev.getDate().greg().toISOString().slice(0, 10);
    const rawName = ev.renderBrief('he') || ev.getDesc();
    const name    = simplifyName(rawName);
    const type    = getType(f, rawName);

    if (!map[dateStr]) map[dateStr] = [];
    // Avoid exact duplicate names on same day
    if (!map[dateStr].some((h) => h.name === name)) {
      map[dateStr].push({ date: dateStr, name, type });
    }
  }

  cache[year] = map;
  return map;
}

export function getHolidaysForDate(date) {
  const d   = typeof date === 'string' ? new Date(date) : date;
  const key = d.toISOString().slice(0, 10);
  const yr  = d.getFullYear();
  const map = buildYear(yr);
  return map[key] || [];
}

export const HOLIDAY_STYLE = {
  holiday:  { bg: 'bg-amber-500/15',  text: 'text-amber-300',  dot: 'bg-amber-400'  },
  memorial: { bg: 'bg-slate-600/25',  text: 'text-slate-400',  dot: 'bg-slate-500'  },
  national: { bg: 'bg-blue-500/15',   text: 'text-blue-300',   dot: 'bg-blue-400'   },
  minor:    { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-400' },
};
