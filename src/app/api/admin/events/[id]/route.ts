import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { EventRow } from '@/lib/events';
import { daysBetween } from '@/lib/recurrence';
import { EventInput, addDays, dayOf, parseEventInput, removeUnusedPosters, timesOnDate } from '../shared';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
type Scope = 'one' | 'following' | 'all';
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const scopeOf = (v: unknown): Scope => (v === 'following' || v === 'all' ? v : 'one');

type Row = EventRow & { series_id: string | null };

/** The rows a scoped change applies to: the event itself, or part/all of its series. */
async function targets(service: SupabaseClient, ev: Row, scope: Scope): Promise<Row[]> {
  if (scope === 'one' || !ev.series_id) return [ev];
  let q = service.from('events').select('*').eq('series_id', ev.series_id);
  if (scope === 'following') q = q.gte('starts_at', ev.starts_at);
  const { data } = await q.order('starts_at');
  return (data ?? []) as Row[];
}

const FIELDS: (keyof EventInput)[] = [
  'title', 'description', 'location', 'category', 'poster_path', 'status', 'donations_enabled', 'donation_goal_cents',
];

// PATCH { ...event, scope?: 'one' | 'following' | 'all' }
// For several dates, only fields changed on this event are copied to the others (so a date
// that was cancelled or moved on its own keeps that), and a time/date change shifts each one.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseEventInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  const { data: found } = await service.from('events').select('*').eq('id', id).maybeSingle();
  if (!found) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const before = found as Row;

  const rows = await targets(service, before, scopeOf(body.scope));
  const oldPosters = rows.map((r) => r.poster_path);

  if (rows.length === 1) {
    const { data, error } = await service.from('events').update(v).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await removeUnusedPosters(service, oldPosters);
    return NextResponse.json({ ok: true, data, updated: 1 });
  }

  // Fields the admin changed on this event
  const changed: Partial<EventInput> = {};
  for (const k of FIELDS) if (v[k] !== before[k as keyof Row]) (changed as Record<string, unknown>)[k] = v[k];
  const timeChanged = v.starts_at !== before.starts_at || v.ends_at !== before.ends_at || v.all_day !== before.all_day;
  const shift = daysBetween(dayOf(before.starts_at), dayOf(v.starts_at));

  if (Object.keys(changed).length) {
    const { error } = await service.from('events').update(changed).in('id', rows.map((r) => r.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (timeChanged) {
    for (const r of rows) {
      const times = timesOnDate(v, addDays(dayOf(r.starts_at), shift));
      const { error } = await service.from('events').update({ ...times, all_day: v.all_day }).eq('id', r.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await removeUnusedPosters(service, oldPosters);
  const { data } = await service.from('events').select('*').eq('id', id).single();
  return NextResponse.json({ ok: true, data, updated: rows.length });
}

// DELETE ?scope=one|following|all: remove the event(s) and unused posters
// (donations keep their record; event_id is cleared)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: found } = await service.from('events').select('*').eq('id', id).maybeSingle();
  if (!found) return NextResponse.json({ ok: true, deleted: 0 });

  const rows = await targets(service, found as Row, scopeOf(new URL(req.url).searchParams.get('scope')));
  const { error } = await service.from('events').delete().in('id', rows.map((r) => r.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await removeUnusedPosters(service, rows.map((r) => r.poster_path));
  return NextResponse.json({ ok: true, deleted: rows.length });
}
