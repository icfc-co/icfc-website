import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Must use service role key for insert
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const amount = session.amount_total! / 100;
    const isRecurring = session.mode === 'subscription';
    const metadata = session.metadata || {};

    const { data, error } = await supabase.from('donations').insert({
      stripe_session_id: session.id,
      donor_email: session.customer_email,
      amount,
      donation_type: metadata.donationType || 'General',
      is_recurring: isRecurring,
    });

    if (error) {
      console.error('Error saving donation:', error);
    } else {
      console.log('Donation saved:', data);
    }
  }

  return new Response('Received', { status: 200 });
}
