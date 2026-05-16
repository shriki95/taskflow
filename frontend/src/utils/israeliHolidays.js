// Israeli public holidays & memorial days (Gregorian dates, years 2025-2028)
// type: 'holiday' | 'memorial' | 'national' | 'minor'
const HOLIDAYS = [
  // ── 5786 (2025-2026) ─────────────────────────────────────────────────────
  { date: '2025-09-22', name: 'ראש השנה',       type: 'holiday'  },
  { date: '2025-09-23', name: 'ראש השנה',       type: 'holiday'  },
  { date: '2025-10-01', name: 'יום כיפור',      type: 'holiday'  },
  { date: '2025-10-06', name: 'סוכות',          type: 'holiday'  },
  { date: '2025-10-07', name: 'סוכות',          type: 'holiday'  },
  { date: '2025-10-08', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2025-10-09', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2025-10-10', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2025-10-11', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2025-10-12', name: 'הושענא רבה',     type: 'minor'    },
  { date: '2025-10-13', name: 'שמיני עצרת / שמחת תורה', type: 'holiday' },
  { date: '2025-12-14', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-15', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-16', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-17', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-18', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-19', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-20', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-21', name: 'חנוכה',          type: 'minor'    },
  { date: '2025-12-22', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-02-12', name: 'ט״ו בשבט',      type: 'minor'    },
  { date: '2026-03-03', name: 'פורים',          type: 'minor'    },
  { date: '2026-04-01', name: 'פסח',            type: 'holiday'  },
  { date: '2026-04-02', name: 'פסח',            type: 'holiday'  },
  { date: '2026-04-03', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2026-04-04', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2026-04-05', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2026-04-06', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2026-04-07', name: 'שביעי של פסח',   type: 'holiday'  },
  { date: '2026-04-16', name: 'יום השואה',      type: 'memorial' },
  { date: '2026-04-29', name: 'יום הזיכרון',    type: 'memorial' },
  { date: '2026-04-30', name: 'יום העצמאות',    type: 'national' },
  { date: '2026-05-14', name: 'ל״ג בעומר',      type: 'minor'    },
  { date: '2026-05-21', name: 'שבועות',         type: 'holiday'  },
  { date: '2026-05-22', name: 'שבועות',         type: 'holiday'  },
  { date: '2026-05-26', name: 'יום ירושלים',    type: 'national' },
  { date: '2026-07-23', name: 'תשעה באב',       type: 'memorial' },

  // ── 5787 (2026-2027) ─────────────────────────────────────────────────────
  { date: '2026-09-11', name: 'ראש השנה',       type: 'holiday'  },
  { date: '2026-09-12', name: 'ראש השנה',       type: 'holiday'  },
  { date: '2026-09-20', name: 'יום כיפור',      type: 'holiday'  },
  { date: '2026-09-25', name: 'סוכות',          type: 'holiday'  },
  { date: '2026-09-26', name: 'סוכות',          type: 'holiday'  },
  { date: '2026-09-27', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2026-09-28', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2026-09-29', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2026-09-30', name: 'חול המועד סוכות', type: 'minor'   },
  { date: '2026-10-01', name: 'הושענא רבה',     type: 'minor'    },
  { date: '2026-10-02', name: 'שמיני עצרת / שמחת תורה', type: 'holiday' },
  { date: '2026-12-04', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-05', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-06', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-07', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-08', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-09', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-10', name: 'חנוכה',          type: 'minor'    },
  { date: '2026-12-11', name: 'חנוכה',          type: 'minor'    },
  { date: '2027-02-01', name: 'ט״ו בשבט',      type: 'minor'    },
  { date: '2027-03-22', name: 'פורים',          type: 'minor'    },
  { date: '2027-04-21', name: 'פסח',            type: 'holiday'  },
  { date: '2027-04-22', name: 'פסח',            type: 'holiday'  },
  { date: '2027-04-23', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2027-04-24', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2027-04-25', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2027-04-26', name: 'חול המועד פסח',  type: 'minor'    },
  { date: '2027-04-27', name: 'שביעי של פסח',   type: 'holiday'  },
  { date: '2027-05-05', name: 'יום השואה',      type: 'memorial' },
  { date: '2027-05-19', name: 'יום הזיכרון',    type: 'memorial' },
  { date: '2027-05-20', name: 'יום העצמאות',    type: 'national' },
  { date: '2027-06-03', name: 'ל״ג בעומר',      type: 'minor'    },
  { date: '2027-06-10', name: 'שבועות',         type: 'holiday'  },
  { date: '2027-06-11', name: 'שבועות',         type: 'holiday'  },
  { date: '2027-06-14', name: 'יום ירושלים',    type: 'national' },
  { date: '2027-08-11', name: 'תשעה באב',       type: 'memorial' },
];

// Map for fast lookup: date string → holiday object
const HOLIDAY_MAP = {};
HOLIDAYS.forEach((h) => {
  if (!HOLIDAY_MAP[h.date]) HOLIDAY_MAP[h.date] = [];
  HOLIDAY_MAP[h.date].push(h);
});

export function getHolidaysForDate(date) {
  const key = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  return HOLIDAY_MAP[key] || [];
}

// Tailwind classes per type
export const HOLIDAY_STYLE = {
  holiday:  { bg: 'bg-amber-500/15',  text: 'text-amber-300',  dot: 'bg-amber-400'  },
  memorial: { bg: 'bg-slate-600/25',  text: 'text-slate-400',  dot: 'bg-slate-500'  },
  national: { bg: 'bg-blue-500/15',   text: 'text-blue-300',   dot: 'bg-blue-400'   },
  minor:    { bg: 'bg-purple-500/10', text: 'text-purple-300', dot: 'bg-purple-400' },
};
