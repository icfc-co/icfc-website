// Shared (client + server) helpers for the community calendar.

export const EVENT_TZ = 'America/Denver';

export const EVENT_CATEGORIES = [
  { key: 'community', label: 'Community', color: 'bg-green-100 text-green-800' },
  { key: 'education', label: 'Education & Lectures', color: 'bg-blue-100 text-blue-800' },
  { key: 'youth', label: 'Youth', color: 'bg-purple-100 text-purple-800' },
  { key: 'sisters', label: 'Sisters', color: 'bg-pink-100 text-pink-800' },
  { key: 'religious', label: 'Religious Occasions', color: 'bg-amber-100 text-amber-800' },
  { key: 'fundraiser', label: 'Fundraiser', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'sports', label: 'Sports & Outdoors', color: 'bg-teal-100 text-teal-800' },
] as const;

export const categoryOf = (key: string) =>
  EVENT_CATEGORIES.find((c) => c.key === key) ?? { key, label: key, color: 'bg-gray-100 text-gray-800' };

export type EventRow = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  poster_path: string | null;
  status: 'published' | 'cancelled' | 'draft';
  donations_enabled: boolean;
  donation_goal_cents: number | null;
};

export const POSTER_BUCKET = 'event-posters';

export function posterUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POSTER_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

// ---- Time zone helpers: events are entered and shown in Fort Collins time ----

function zoneParts(ts: number, tz = EVENT_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

function offsetMs(ts: number, tz = EVENT_TZ) {
  const p = zoneParts(ts, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}

/** "2026-12-05T18:30" (Fort Collins time) -> ISO UTC string */
export function zonedInputToIso(value: string, tz = EVENT_TZ): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  let utc = guess - offsetMs(guess, tz);
  utc = guess - offsetMs(utc, tz); // settle across DST changes
  return new Date(utc).toISOString();
}

/** ISO -> "2026-12-05T18:30" in Fort Collins time (for datetime-local inputs) */
export function isoToZonedInput(iso: string, tz = EVENT_TZ) {
  const p = zoneParts(new Date(iso).getTime(), tz);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "YYYY-MM-DD" of an instant in Fort Collins time */
export function zonedDayKey(iso: string, tz = EVENT_TZ) {
  return isoToZonedInput(iso, tz).slice(0, 10);
}

export function fmtEventDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: EVENT_TZ, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', ...opts,
  });
}

export function fmtEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: EVENT_TZ, hour: 'numeric', minute: '2-digit' });
}

/** "Sat, Dec 5, 2026 · 6:30 PM – 9:00 PM" */
export function fmtEventWhen(e: Pick<EventRow, 'starts_at' | 'ends_at' | 'all_day'>) {
  const start = fmtEventDate(e.starts_at);
  if (e.all_day) {
    if (e.ends_at && zonedDayKey(e.ends_at) !== zonedDayKey(e.starts_at)) return `${start} – ${fmtEventDate(e.ends_at)}`;
    return `${start} · All day`;
  }
  if (!e.ends_at) return `${start} · ${fmtEventTime(e.starts_at)}`;
  if (zonedDayKey(e.ends_at) === zonedDayKey(e.starts_at)) {
    return `${start} · ${fmtEventTime(e.starts_at)} – ${fmtEventTime(e.ends_at)}`;
  }
  return `${start} ${fmtEventTime(e.starts_at)} – ${fmtEventDate(e.ends_at)} ${fmtEventTime(e.ends_at)}`;
}

export const fmtUsd = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ---- Add to calendar ----

const icsStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function endOrDefault(e: Pick<EventRow, 'starts_at' | 'ends_at'>) {
  return e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 60 * 60 * 1000).toISOString();
}

function allDayRange(e: Pick<EventRow, 'starts_at' | 'ends_at'>) {
  const start = zonedDayKey(e.starts_at).replace(/-/g, '');
  const lastDay = zonedDayKey(e.ends_at ?? e.starts_at);
  const end = new Date(Date.UTC(+lastDay.slice(0, 4), +lastDay.slice(5, 7) - 1, +lastDay.slice(8, 10) + 1))
    .toISOString().slice(0, 10).replace(/-/g, '');
  return [start, end];
}

export function googleCalendarUrl(e: EventRow, pageUrl: string) {
  const dates = e.all_day ? allDayRange(e).join('/') : `${icsStamp(e.starts_at)}/${icsStamp(endOrDefault(e))}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    details: [e.description ?? '', pageUrl].filter(Boolean).join('\n\n'),
    location: e.location ?? '',
    ctz: EVENT_TZ,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function icsFile(e: EventRow, pageUrl: string) {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const [ds, de] = allDayRange(e);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ICFC//Events//EN', 'BEGIN:VEVENT',
    `UID:${e.id}@icfc.org`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    ...(e.all_day
      ? [`DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${de}`]
      : [`DTSTART:${icsStamp(e.starts_at)}`, `DTEND:${icsStamp(endOrDefault(e))}`]),
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc([e.description ?? '', pageUrl].filter(Boolean).join('\n\n'))}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    `URL:${pageUrl}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
