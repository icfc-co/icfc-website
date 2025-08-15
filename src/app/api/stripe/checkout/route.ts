// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const { amountCents, fund, recurrence, donorEmail, donorName, note, userId } = await req.json();

    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'Minimum $1.00' }, { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      console.error('Missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Server misconfigured (STRIPE_SECRET_KEY)' }, { status: 500 });
    }

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const mode = recurrence === 'monthly' ? 'subscription' : 'payment';
    const productName = `ICFC ${fund || 'General'} Donation`;

    // derive a base URL even if NEXT_PUBLIC_BASE_URL is missing
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${req.nextUrl.protocol}//${req.headers.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: donorEmail || undefined,
      line_items: [
        mode === 'subscription'
          ? {
              price_data: {
                currency: 'usd',
                product_data: { name: productName },
                recurring: { interval: 'month' },
                unit_amount: amountCents,
              },
              quantity: 1,
            }
          : {
              price_data: {
                currency: 'usd',
                product_data: { name: productName },
                unit_amount: amountCents,
              },
              quantity: 1,
            },
      ],
      metadata: {
        fund: fund || 'general',
        recurrence: recurrence || 'one_time',
        donorName: donorName || '',
        note: note || '',
        userId: userId || '',
      },
      success_url: `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('checkout error:', e);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
