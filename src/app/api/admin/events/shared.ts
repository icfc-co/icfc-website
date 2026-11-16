// Validation shared by the admin event routes (server only).
import type { SupabaseClient } from '@supabase/supabase-js';
import { EVENT_CATEGORIES, POSTER_BUCKET, isoToZonedInput, zonedInputToIso } from '@/lib/events';
import { daysBetween } from '@/lib/recurrence';

const addDays = (k: string, n: number) => new Date(Date.parse(`${k}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Start/end of an event moved to another calendar day, keeping its Fort Collins
 * wall-clock times and length in days (DST-safe: each date is converted on its own).
 */
export function timesOnDate(base: { starts_at: string; ends_at: string | null; all_day: boolean }, date: string) {
  const s = isoToZonedInput(base.starts_at); // "YYYY-MM-DDTHH:mm"
  const startDay = s.slice(0, 10);
  const starts_at = zonedInputToIso(base.all_day ? date : `${date}${s.slice(10)}`)!;
  let ends_at: string | null = null;
  if (base.ends_at) {
    const e = isoToZonedInput(base.ends_at);
    const endDay = addDays(date, daysBetween(startDay, e.slice(0, 10)));
    ends_at = zonedInputToIso(base.all_day ? endDay : `${endDay}${e.slice(10)}`);
  }
  return { starts_at, ends_at };
}

export const dayOf = (iso: string) => isoToZonedInput(iso).slice(0, 10);
export { addDays };

/** Delete poster files no event uses any more (occurrences of a series share one poster). */
export async function removeUnusedPosters(service: SupabaseClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter(Boolean))] as string[];
  for (const p of unique) {
    const { count } = await service.from('events').select('id', { count: 'exact', head: true }).eq('poster_path', p);
    if (!count) await service.storage.from(POSTER_BUCKET).remove([p]);
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export type EventInput = {
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

// Body uses Fort Collins wall-clock times: start/end as "YYYY-MM-DDTHH:mm" (or "YYYY-MM-DD" when all_day).
export function parseEventInput(b: Record<string, unknown>): { ok: true; value: EventInput } | { ok: false; error: string } {
  const title = str(b.title, 200);
  if (!title) return { ok: false, error: 'Please enter a title.' };

  const all_day = b.all_day === true;
  const startRaw = str(b.start, 16);
  const endRaw = str(b.end, 16);
  const starts_at = zonedInputToIso(all_day ? startRaw.slice(0, 10) : startRaw);
  if (!starts_at) return { ok: false, error: 'Please enter a valid start date and time.' };
  let ends_at: string | null = null;
  if (endRaw) {
    ends_at = zonedInputToIso(all_day ? endRaw.slice(0, 10) : endRaw);
    if (!ends_at) return { ok: false, error: 'Please enter a valid end date and time.' };
    if (ends_at < starts_at) return { ok: false, error: 'The end must be after the start.' };
  }

  const category = EVENT_CATEGORIES.some((c) => c.key === b.category) ? (b.category as string) : 'community';
  const status = ['published', 'cancelled', 'draft'].includes(b.status as string)
    ? (b.status as EventInput['status'])
    : 'published';

  const poster = str(b.poster_path, 300);
  if (poster && !/^[a-z0-9/_.-]+$/i.test(poster)) return { ok: false, error: 'Invalid poster.' };

  const goal = Number(b.donation_goal);
  const donation_goal_cents = Number.isFinite(goal) && goal > 0 ? Math.round(goal * 100) : null;

  return {
    ok: true,
    value: {
      title,
      description: str(b.description, 5000) || null,
      location: str(b.location, 300) || null,
      category,
      starts_at,
      ends_at,
      all_day,
      poster_path: poster || null,
      status,
      donations_enabled: b.donations_enabled === true,
      donation_goal_cents,
    },
  };
}
