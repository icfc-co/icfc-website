import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    donorName, donorEmail, amountCents, fund, note,
    transferDate, proofUrl, userId, last4
  } = body || {};

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: 'Amount must be at least $1.00' }, { status: 400 });
  }
  if (!last4 || String(last4).trim().length < 4) {
    return NextResponse.json({ error: 'Zelle reference last 4 is required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ins = await supabase.from('donations')
    .insert({
      user_id: userId || null,
      donor_name: donorName || null,
      donor_email: donorEmail || null,
      method: 'zelle',
      status: 'pending',
      amount_cents: amountCents,
      currency: 'usd',
      fund: fund || 'general',
      recurrence: 'one_time',
      note: note || null,
      external_ref: last4, // keep last 4 here too
    })
    .select('id')
    .single();

  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  const ins2 = await supabase.from('zelle_confirmations').insert({
    donation_id: ins.data.id,
    transfer_date: transferDate || null,
    proof_url: proofUrl || null,
  });

  if (ins2.error) return NextResponse.json({ error: ins2.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, donationId: ins.data.id });
}
