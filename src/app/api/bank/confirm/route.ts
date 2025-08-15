import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    donorName, donorEmail, amountCents, fund, note,
    transferDate, proofUrl, transactionId, userId
  } = body || {};

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: 'Amount must be at least $1.00' }, { status: 400 });
  }
  if (!transactionId || String(transactionId).trim().length < 4) {
    return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
  }

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
      fund: fund || 'general',
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

  return NextResponse.json({ ok: true, donationId: insertDonation.data.id });
}
