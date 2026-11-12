import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { NIKAH_STATUSES } from '@/lib/nikah';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// PATCH: staff workflow fields only (the couple's answers stay as submitted)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if ('status' in b) {
    if (!NIKAH_STATUSES.some((s) => s.value === b.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    patch.status = b.status;
  }
  if ('scheduled_date' in b) {
    const d = text(b.scheduled_date, 10);
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    patch.scheduled_date = d;
  }
  if ('scheduled_time' in b) {
    const t = text(b.scheduled_time, 5);
    if (t && !/^\d{2}:\d{2}$/.test(t)) return NextResponse.json({ error: 'Invalid time' }, { status: 400 });
    patch.scheduled_time = t;
  }
  if ('officiant' in b) patch.officiant = text(b.officiant, 150);
  if ('staff_notes' in b) patch.staff_notes = text(b.staff_notes, 5000);
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error } = await auth.service
    .from('nikah_requests').update(patch as never).eq('id', id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}

// DELETE: remove a request permanently (e.g. spam or duplicates)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await auth.service.from('nikah_requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
