import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { POSTER_BUCKET } from '@/lib/events';
import { parseEventInput } from '../shared';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

// PATCH: replace an event's fields
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseEventInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data: before } = await auth.service.from('events').select('poster_path').eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const { data, error } = await auth.service
    .from('events').update(parsed.value as never).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Poster replaced or removed: delete the old file
  const oldPoster = (before as { poster_path: string | null }).poster_path;
  if (oldPoster && oldPoster !== parsed.value.poster_path) {
    await auth.service.storage.from(POSTER_BUCKET).remove([oldPoster]);
  }
  return NextResponse.json({ ok: true, data });
}

// DELETE: remove an event and its poster (donations keep their record; event_id is cleared)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await auth.service.from('events').delete().eq('id', id).select('poster_path').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const poster = (data as { poster_path: string | null } | null)?.poster_path;
  if (poster) await auth.service.storage.from(POSTER_BUCKET).remove([poster]);
  return NextResponse.json({ ok: true });
}
