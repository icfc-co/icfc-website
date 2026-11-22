// Recurring events (client + server). A rule expands into a list of dates
// (YYYY-MM-DD, Fort Collins calendar days); each date becomes its own event row.

export type RepeatRule = {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;                 // every N days / weeks / months
  weekdays?: number[];              // weekly: 0 = Sunday … 6 = Saturday
  monthly?: 'date' | 'nth' | 'last'; // monthly: same date, e.g. "2nd Friday", or "last Friday"
  until?: string | null;            // YYYY-MM-DD, inclusive
  count?: number | null;            // or: number of occurrences
};

export const MAX_OCCURRENCES = 104;   // two years of weekly events
export const MAX_SPAN_DAYS = 2 * 366;

const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];

const toDate = (k: string) => new Date(`${k}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (k: string, n: number) => toKey(new Date(toDate(k).getTime() + n * DAY));
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
export const weekdayOf = (k: string) => toDate(k).getUTCDay();
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Which "nth weekday" a date is in its month (1–5), and whether it is the last one. */
export function nthWeekday(k: string) {
  const d = toDate(k);
  const day = d.getUTCDate();
  return { n: Math.ceil(day / 7), last: day + 7 > daysInMonth(d.getUTCFullYear(), d.getUTCMonth()) };
}

/** Every occurrence date for a rule, starting with (and always including) `start`. */
export function expandDates(rule: RepeatRule, start: string): string[] {
  const interval = Math.max(1, Math.min(12, Math.floor(rule.interval || 1)));
  const limit = Math.min(rule.count && rule.count > 0 ? rule.count : MAX_OCCURRENCES, MAX_OCCURRENCES);
  const lastDay = [rule.until || null, addDays(start, MAX_SPAN_DAYS)].filter(Boolean).sort()[0] as string;
  const out: string[] = [];
  const push = (k: string) => {
    if (k < start || k > lastDay || out.length >= limit) return false;
    if (!out.includes(k)) out.push(k);
    return true;
  };

  if (rule.freq === 'daily') {
    for (let k = start; k <= lastDay && out.length < limit; k = addDays(k, interval)) push(k);
  } else if (rule.freq === 'weekly') {
    const days = [...new Set([weekdayOf(start), ...(rule.weekdays ?? [])])].filter((d) => d >= 0 && d <= 6).sort();
    const weekStart = addDays(start, -weekdayOf(start)); // the Sunday of the first week
    for (let w = 0; out.length < limit; w += interval) {
      const sunday = addDays(weekStart, w * 7);
      if (sunday > lastDay) break;
      for (const d of days) push(addDays(sunday, d));
    }
  } else {
    const s = toDate(start);
    const mode = rule.monthly ?? 'date';
    const wd = s.getUTCDay();
    const { n } = nthWeekday(start);
    for (let i = 0; out.length < limit; i += interval) {
      const y = s.getUTCFullYear() + Math.floor((s.getUTCMonth() + i) / 12);
      const m = (s.getUTCMonth() + i) % 12;
      if (toKey(new Date(Date.UTC(y, m, 1))) > lastDay) break;
      let day: number | null;
      if (mode === 'date') {
        day = s.getUTCDate() <= daysInMonth(y, m) ? s.getUTCDate() : null; // no Feb 30th: skip that month
      } else {
        const firstWd = (wd - new Date(Date.UTC(y, m, 1)).getUTCDay() + 7) % 7 + 1;
        if (mode === 'nth') {
          day = firstWd + (n - 1) * 7;
          if (day > daysInMonth(y, m)) day = null;
        } else {
          day = firstWd + Math.floor((daysInMonth(y, m) - firstWd) / 7) * 7;
        }
      }
      if (day) push(toKey(new Date(Date.UTC(y, m, day))));
    }
  }
  return out;
}

const fmtDay = (k: string) =>
  toDate(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "Every Friday", "Every 2 weeks on Tuesday & Thursday", "Monthly on the 2nd Saturday" … */
export function describeRule(rule: RepeatRule | null | undefined, start: string, withEnd = false): string {
  if (!rule) return '';
  const every = (unit: string) => (rule.interval > 1 ? `Every ${rule.interval} ${unit}s` : '');
  let text: string;
  if (rule.freq === 'daily') {
    text = every('day') || 'Every day';
  } else if (rule.freq === 'weekly') {
    const days = [...new Set([weekdayOf(start), ...(rule.weekdays ?? [])])].sort().map((d) => WEEKDAYS[d]);
    const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} & ${days[days.length - 1]}` : days[0];
    text = rule.interval > 1 ? `${every('week')} on ${list}` : `Every ${list}`;
  } else {
    const wd = WEEKDAYS[weekdayOf(start)];
    const on = rule.monthly === 'nth' ? `the ${ORDINAL[nthWeekday(start).n - 1]} ${wd}`
      : rule.monthly === 'last' ? `the last ${wd}`
      : `day ${toDate(start).getUTCDate()}`;
    text = `${rule.interval > 1 ? every('month') : 'Monthly'} on ${on}`;
  }
  if (withEnd) {
    if (rule.until) text += ` until ${fmtDay(rule.until)}`;
    else if (rule.count) text += `, ${rule.count} times`;
  }
  return text;
}

/** Validate a rule from a request body; null when it isn't a usable rule. */
export function parseRule(v: unknown): RepeatRule | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  if (!['daily', 'weekly', 'monthly'].includes(r.freq as string)) return null;
  const until = typeof r.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.until) ? r.until : null;
  const count = Number.isInteger(r.count) && (r.count as number) > 0 ? Math.min(r.count as number, MAX_OCCURRENCES) : null;
  if (!until && !count) return null;
  return {
    freq: r.freq as RepeatRule['freq'],
    interval: Math.max(1, Math.min(12, Math.floor(Number(r.interval) || 1))),
    weekdays: Array.isArray(r.weekdays) ? [...new Set(r.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : undefined,
    monthly: ['date', 'nth', 'last'].includes(r.monthly as string) ? (r.monthly as RepeatRule['monthly']) : undefined,
    until,
    count: until ? null : count,
  };
}

/** Keep only the first upcoming occurrence of each series (for compact lists). */
export function firstOfSeries<T extends { series_id?: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (!r.series_id) return true;
    if (seen.has(r.series_id)) return false;
    seen.add(r.series_id);
    return true;
  });
}
