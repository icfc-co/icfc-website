import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { parseAnnouncement } from '../shared';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

// PATCH: edit the announcement (website copy; emails already sent are not changed)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: before } = await service.from('announcements').select('*').eq('id', id).maybeSingle();
  if (!before) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const parsed = parseAnnouncement({ ...before, ...b });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (before.email_requested && parsed.value.audience !== before.audience) {
    return NextResponse.json({ error: 'This announcement was emailed to members, so its audience can’t be changed.' }, { status: 400 });
  }

  const { data, error } = await service.from('announcements').update(parsed.value).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

// DELETE: remove the announcement (and any emails still waiting to be sent)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await service.from('announcements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
