import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { parseEventInput } from './shared';

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

// POST: create an event
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const parsed = parseEventInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await auth.service.from('events').insert(parsed.value as never).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
