import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveDonationEvent } from '@/lib/event-donation';
import { sendStaffAlert, usd } from '@/lib/staff-alerts';

export const runtime = 'nodejs';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body');
  }

  const {
    donorName = null,
    donorEmail = null,
    amountCents,
    fund,
    note = null,
    transferDate = null,     // yyyy-mm-dd or null
    proofUrl = null,         // optional URL
    last4,                   // Zelle ref last 4 (REQUIRED)
    eventId = null,          // optional: gift for a calendar event
  } = body || {};

  // basic validation
  if (!amountCents || amountCents < 100) return bad('Amount must be at least $1.00');
  let event;
  try { event = await resolveDonationEvent(eventId); }
  catch (e) { return bad((e as Error).message); }
  if (!fund && !event) return bad('Missing fund');
  if (!last4 || String(last4).trim().length < 3) return bad('Zelle reference last 4 is required');

  // service-role server client (safe on the server)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // <- you said your env is named this
  );

  // 1) create master donation row
  const { data: ins, error: insErr } = await supabase
    .from('donations')
    .insert({
      method: 'zelle',
      status: 'pending',
      amount_cents: amountCents,
      currency: 'usd',
      fund: event ? 'event' : fund,
      ...(event ? { event_id: event.id } : {}),
      recurrence: 'one_time',
      donor_name: donorName,
      donor_email: donorEmail,
      note,
      external_ref: String(last4).trim(),
    })
    .select('id')
    .single();

  if (insErr || !ins) return bad(insErr?.message || 'Failed to create donation', 500);

  // 2) (optional) store extra proof
  if (transferDate || proofUrl) {
    const { error: zErr } = await supabase.from('zelle_confirmations').insert({
      donation_id: ins.id,
      transfer_date: transferDate || null,
      proof_url: proofUrl || null,
    });
    if (zErr) return bad(zErr.message, 500);
  }

  after(() => sendStaffAlert('donations_to_verify', {
    title: `Zelle donation to verify: ${usd(amountCents)}`,
    intro: 'A donor reported a Zelle donation. Please match it against the bank account and mark it verified.',
    fields: [
      ['Amount', usd(amountCents)],
      ['Fund', event ? `Event: ${event.title}` : fund],
      ['Donor', [donorName, donorEmail].filter(Boolean).join(' · ')],
      ['Zelle ref (last 4)', String(last4).trim()],
      ['Transfer date', transferDate],
      ['Note', note],
    ],
  }));

  return NextResponse.json({ ok: true, donation_id: ins.id });
}
