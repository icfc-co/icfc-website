import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { expandDates, parseRule } from '@/lib/recurrence';
import { dayOf, parseEventInput, timesOnDate } from './shared';

export const dynamic = 'force-dynamic';

// GET: every event (drafts included) with donation totals, newest start first
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: events, error }, { data: gifts, error: gErr }] = await Promise.all([
    auth.service.from('events').select('*').order('starts_at', { ascending: false }),
    auth.service.from('donations').select('event_id, status, amount_cents').not('event_id', 'is', null),
  ]);
  if (error || gErr) return NextResponse.json({ error: (error ?? gErr)!.message }, { status: 500 });

  const totals: Record<string, { succeeded_cents: number; pending_cents: number; gifts: number }> = {};
  for (const g of (gifts ?? []) as { event_id: string; status: string; amount_cents: number }[]) {
    const t = (totals[g.event_id] ??= { succeeded_cents: 0, pending_cents: 0, gifts: 0 });
    if (g.status === 'succeeded') { t.succeeded_cents += g.amount_cents; t.gifts++; }
    else if (g.status === 'pending' || g.status === 'needs_review') t.pending_cents += g.amount_cents;
  }

  return NextResponse.json({ data: events ?? [], totals });
}

// POST: create an event, or with `repeat` a series (one event per date)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;

  const body = await req.json().catch(() => ({}));
  const parsed = parseEventInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (!body.repeat) {
    const { data, error } = await service.from('events').insert(parsed.value).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data, created: 1 });
  }

  const rule = parseRule(body.repeat);
  if (!rule) return NextResponse.json({ error: 'Choose how often it repeats and when it ends.' }, { status: 400 });
  const dates = expandDates(rule, dayOf(parsed.value.starts_at));
  if (dates.length < 2) return NextResponse.json({ error: 'This repeat setting only gives one date. Pick a later end date.' }, { status: 400 });

  const series_id = crypto.randomUUID();
  const rows = dates.map((d) => ({ ...parsed.value, ...timesOnDate(parsed.value, d), series_id, repeat_rule: rule }));
  const { data, error } = await service.from('events').insert(rows).select('*').order('starts_at').limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data?.[0], created: rows.length });
}
