import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/auth-user';
import { norm } from '@/lib/membership-access';
import { verifyUnsubscribe } from '@/lib/announcements-server';

export const dynamic = 'force-dynamic';

/**
 * POST — unsubscribe (or resubscribe) an address from announcement emails.
 * Accepts the signed link's ?e=&t= in the query (Gmail one-click, RFC 8058) or
 * JSON { e, t, action: 'unsubscribe' | 'resubscribe' } from /unsubscribe.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = req.headers.get('content-type')?.includes('application/json') ? await req.json().catch(() => ({})) : {};
  const email = norm(body.e ?? url.searchParams.get('e'));
  const token = String(body.t ?? url.searchParams.get('t') ?? '');
  const action = body.action === 'resubscribe' ? 'resubscribe' : 'unsubscribe';

  if (!email || !verifyUnsubscribe(email, token)) {
    return NextResponse.json({ error: 'This unsubscribe link is invalid or incomplete.' }, { status: 400 });
  }

  const service = serviceClient();
  const { error } = action === 'unsubscribe'
    ? await service.from('announcement_unsubscribes').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
    : await service.from('announcement_unsubscribes').delete().eq('email', email);
  if (error) return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });

  return NextResponse.json({ ok: true, email, subscribed: action === 'resubscribe' });
}
