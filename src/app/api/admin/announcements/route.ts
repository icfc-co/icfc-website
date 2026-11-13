import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { activeMemberRecipients, unsubscribedSet } from '@/lib/announcements-server';
import { parseAnnouncement } from './shared';

export const dynamic = 'force-dynamic';

// GET: all announcements with email progress, plus how many members an email would reach
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;

  const { data, error } = await service.from('announcements').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];

  const [stats, members, unsub] = await Promise.all([
    rows.length
      ? service.rpc('announcement_delivery_stats', { p_ids: rows.map((r) => r.id) }).then((r) => r.data ?? [])
      : Promise.resolve([]),
    activeMemberRecipients(service),
    unsubscribedSet(service),
  ]);

  return NextResponse.json({
    data: rows,
    stats: Object.fromEntries((stats as { announcement_id: string }[]).map((s) => [s.announcement_id, s])),
    reach: { members: members.length, unsubscribed: members.filter((m) => unsub.has(m.email)).length },
    emailReady: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  });
}

// POST: create an announcement; for members with send_email, queue one email per active member
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;

  const b = await req.json().catch(() => ({}));
  const parsed = parseAnnouncement(b);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;
  const sendEmail = v.audience === 'members' && b.send_email === true;
  if (sendEmail && !(process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return NextResponse.json({ error: 'Email is not set up on the server (SMTP_USER / SMTP_PASS).' }, { status: 400 });
  }

  const { data: prof } = await service.from('profiles').select('name').eq('id', auth.user.id).maybeSingle();
  const { data: row, error } = await service
    .from('announcements')
    .insert({
      ...v,
      email_requested: sendEmail,
      created_by: auth.user.id,
      created_by_name: (prof as { name?: string } | null)?.name || auth.user.email || null,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let queued = 0;
  if (sendEmail) {
    try {
      const [members, unsub] = await Promise.all([activeMemberRecipients(service), unsubscribedSet(service)]);
      const list = members.filter((m) => v.important || !unsub.has(m.email));
      for (let i = 0; i < list.length; i += 500) {
        const { error: qErr } = await service.from('announcement_deliveries').insert(
          list.slice(i, i + 500).map((m) => ({ announcement_id: row.id, email: m.email, name: m.name }))
        );
        if (qErr) throw qErr;
      }
      queued = list.length;
      if (!queued) await service.from('announcements').update({ emailed_at: new Date().toISOString() }).eq('id', row.id);
    } catch (e) {
      return NextResponse.json({
        ok: true, data: row, queued: 0,
        warning: `Announcement saved, but emails could not be queued: ${(e as Error).message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, data: row, queued });
}
