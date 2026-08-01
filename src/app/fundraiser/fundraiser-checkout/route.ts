import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FundraiserCheckoutBody = {
  amountCents?: number;
  donorName?: string;
  donorEmail?: string;
  recurrence?: 'one_time' | 'monthly';
};

function asBody(value: unknown): FundraiserCheckoutBody {
  if (!value || typeof value !== 'object') return {};
  return value as FundraiserCheckoutBody;
}

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_SECRET_KEY' },
      { status: 500 }
    );
  }

  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  const host =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    'localhost:3000';
  const proto =
    req.headers.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https');
  const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;

  const successUrl = new URL('/donate/success', base).toString();
  const cancelUrl = new URL('/fundraiser?canceled=1', base).toString();

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

  try {
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asBody(rawBody);
    const amountCents = Number(body.amountCents ?? 0);

    if (!Number.isFinite(amountCents) || amountCents < 100) {
      return NextResponse.json(
        { error: 'Please enter a valid donation amount of at least $1.' },
        { status: 400 }
      );
    }

    const donorName = String(body.donorName ?? '').trim();
    const donorEmail = String(body.donorEmail ?? '').trim();
    const recurrence = String(body.recurrence ?? 'one_time');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'ICFC Masjid Expansion Fundraiser' },
            unit_amount: Math.round(amountCents),
          },
          quantity: 1,
        },
      ],
      customer_email: donorEmail || undefined,
      metadata: {
        fund: 'masjid_expansion',
        campaign: 'fundraiser_page',
        recurrence,
        donorName,
        donorEmail,
        note: 'Masjid expansion fundraiser donation',
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout error' },
      { status: 400 }
    );
  }
}
