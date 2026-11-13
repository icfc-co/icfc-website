import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { fromAddress, getMailer, oneLine } from '@/lib/mailer';
import { renderAnnouncement, unsubscribeUrl } from '@/lib/announcements-server';
import { SITE } from '@/lib/site';
import { parseAnnouncement } from '../shared';

export const dynamic = 'force-dynamic';

// POST: email a preview of the draft to the signed-in admin only
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 });

  const parsed = parseAnnouncement({ ...(await req.json().catch(() => ({}))), audience: 'members' });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const mail = getMailer();
  if (!mail) return NextResponse.json({ error: 'Email is not set up on the server (SMTP_USER / SMTP_PASS).' }, { status: 500 });

  const to = auth.user.email;
  const { html, text } = renderAnnouncement(parsed.value, { email: to });
  try {
    await mail.sendMail({
      from: fromAddress(process.env.ANNOUNCE_FROM_NAME || SITE.name),
      to,
      replyTo: SITE.email,
      subject: oneLine(`[TEST] ${parsed.value.important ? '[Important] ' : ''}${parsed.value.title}`, 200),
      html,
      text,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl(to)}>` },
    });
  } catch (e) {
    return NextResponse.json({ error: `Could not send: ${(e as Error).message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, to });
}
