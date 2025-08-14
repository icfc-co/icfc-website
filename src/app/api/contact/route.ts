// ----------
// FILE: src/app/api/contact/route.ts
// ----------
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string | undefined; // server-only

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });

    const { name, email, phone, reason, subject, message, subscribe } = body;
    if (!name || !email || !reason || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (String(message).length > 5000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.warn('[contact] Supabase not configured.');
      return NextResponse.json({ error: 'Server DB not configured.' }, { status: 501 });
    }

    // Insert contact message
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        name,
        email,
        phone: phone || null,
        reason,
        subject,
        message,
        subscribe: !!subscribe,
        status: 'new',
        source: 'web',
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      console.error('[contact] insert error:', insertErr);
      return NextResponse.json({ error: 'Could not save your message. Please try again later.' }, { status: 500 });
    }

    // Newsletter opt-in (idempotent)
    if (subscribe) {
      const { error: subErr } = await supabaseAdmin
        .from('newsletter_subscribers')
        .upsert(
          { email, name, source: 'contact_form' },
          { onConflict: 'email' }
        );
      if (subErr) console.error('[contact] newsletter upsert error:', subErr);
    }

    return NextResponse.json({ ok: true, id: inserted?.id, created_at: inserted?.created_at });
  } catch (err: any) {
    console.error('[contact] API error:', err?.message || err);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
