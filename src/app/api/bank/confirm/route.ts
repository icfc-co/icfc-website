import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveDonationEvent } from '@/lib/event-donation';
import { sendStaffAlert, usd } from '@/lib/staff-alerts';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    donorName, donorEmail, amountCents, fund, note,
    transferDate, proofUrl, transactionId, eventId
  } = body || {};
  // userId from the body is ignored: anyone could attach a donation to another account
  const userId = null;

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: 'Amount must be at least $1.00' }, { status: 400 });
  }
  if (!transactionId || String(transactionId).trim().length < 4) {
    return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
  }

  let event;
  try { event = await resolveDonationEvent(eventId); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const insertDonation = await supabase.from('donations')
    .insert({
      user_id: userId || null,
      donor_name: donorName || null,
      donor_email: donorEmail || null,
      method: 'bank',
      status: 'pending',
      amount_cents: amountCents,
      currency: 'usd',
      fund: event ? 'event' : (fund || 'general'),
      ...(event ? { event_id: event.id } : {}),
      recurrence: 'one_time',
      note: note || null,
      external_ref: transactionId, // store it on the master record too
    })
    .select('id')
    .single();

  if (insertDonation.error) {
    return NextResponse.json({ error: insertDonation.error.message }, { status: 500 });
  }

  const ins2 = await supabase.from('bank_confirmations').insert({
    donation_id: insertDonation.data.id,
    transfer_date: transferDate || null,
    transaction_id: transactionId,
    proof_url: proofUrl || null,
  });

  if (ins2.error) {
    return NextResponse.json({ error: ins2.error.message }, { status: 500 });
  }

  after(() => sendStaffAlert('donations_to_verify', {
    title: `Bank transfer to verify: ${usd(amountCents)}`,
    intro: 'A donor reported a bank transfer. Please match it against the bank account and mark it verified.',
    fields: [
      ['Amount', usd(amountCents)],
      ['Fund', event ? `Event: ${event.title}` : (fund || 'general')],
      ['Donor', [donorName, donorEmail].filter(Boolean).join(' · ')],
      ['Transaction ID', String(transactionId).trim()],
      ['Transfer date', transferDate],
      ['Note', note],
    ],
  }));

  return NextResponse.json({ ok: true, donationId: insertDonation.data.id });
}
