import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';
import { fromAddress, oneLine, openMailPool } from '@/lib/mailer';
import { oneClickUrl, renderAnnouncement, unsubscribeUrl } from '@/lib/announcements-server';
import { SITE } from '@/lib/site';
import type { Announcement } from '@/lib/announcements';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const BATCH = 20;
const MAX_ATTEMPTS = 3;

type Delivery = { id: number; email: string; name: string | null; attempts: number };

/**
 * POST: send the next batch of queued emails for this announcement and return
 * progress. The admin page calls this repeatedly until nothing is pending, so a
 * large send never hits the server time limit. { retryFailed: true } re-queues
 * failed addresses first.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const service = auth.service as unknown as SupabaseClient;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: a } = await service.from('announcements').select('*').eq('id', id).maybeSingle();
  if (!a) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  const ann = a as Announcement;

  const b = await req.json().catch(() => ({}));
  if (b.retryFailed === true) {
    await service.from('announcement_deliveries')
      .update({ status: 'pending', error: null, attempts: 0 })
      .eq('announcement_id', id).eq('status', 'failed');
    await service.from('announcements').update({ emailed_at: null }).eq('id', id);
  }

  const pool = openMailPool();
  if (!pool) return NextResponse.json({ error: 'Email is not set up on the server (SMTP_USER / SMTP_PASS).' }, { status: 500 });

  const { data: claimed, error: cErr } = await service.rpc('claim_announcement_deliveries', { p_announcement: id, p_limit: BATCH });
  if (cErr) { pool.close(); return NextResponse.json({ error: cErr.message }, { status: 500 }); }

  const from = fromAddress(process.env.ANNOUNCE_FROM_NAME || SITE.name);
  const subject = oneLine(`${ann.important ? '[Important] ' : ''}${ann.title}`, 200);
  let sentNow = 0;
  let lastError: string | null = null;

  try {
    await Promise.all(((claimed ?? []) as Delivery[]).map(async (d) => {
      const { html, text } = renderAnnouncement(ann, d);
      try {
        await pool.sendMail({
          from,
          to: d.name ? { name: d.name, address: d.email } : d.email,
          replyTo: SITE.email,
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<${oneClickUrl(d.email)}>, <${unsubscribeUrl(d.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        sentNow++;
        await service.from('announcement_deliveries').update({ status: 'sent', error: null, updated_at: new Date().toISOString() }).eq('id', d.id);
      } catch (e) {
        const msg = String((e as Error)?.message ?? e).slice(0, 300);
        lastError = msg;
        // Temporary problems (e.g. Gmail's daily limit) go back in the queue; bad addresses fail after a few tries
        const retry = d.attempts < MAX_ATTEMPTS && !/invalid|does not exist|no such user|5\.1\.1/i.test(msg);
        await service.from('announcement_deliveries')
          .update({ status: retry ? 'pending' : 'failed', error: msg, updated_at: new Date().toISOString() })
          .eq('id', d.id);
      }
    }));
  } finally {
    pool.close();
  }

  const { data: s } = await service.rpc('announcement_delivery_stats', { p_ids: [id] });
  const stats = ((s ?? [])[0] as { total: number; sent: number; failed: number; pending: number } | undefined)
    ?? { total: 0, sent: 0, failed: 0, pending: 0 };

  if (stats.pending === 0 && !ann.emailed_at) {
    await service.from('announcements').update({ emailed_at: new Date().toISOString() }).eq('id', id);
  }
  // Nothing in this batch went out (e.g. daily limit reached): the page pauses instead of looping
  const stalled = (claimed ?? []).length > 0 && sentNow === 0;
  return NextResponse.json({ ok: true, stats, stalled, lastError: stalled ? lastError : null });
}
