import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExpansionCheckoutBody = {
  amountCents?: number;
  donorName?: string;
  donorEmail?: string;
  recurrence?: 'one_time' | 'monthly';
};

function asBody(value: unknown): ExpansionCheckoutBody {
  if (!value || typeof value !== 'object') return {};
  return value as ExpansionCheckoutBody;
}

function isLocalHost(host: string) {
  return host.includes('localhost') || host.startsWith('127.0.0.1');
}

function pickStripeSecret(host: string) {
  const primary = (process.env.STRIPE_SECRET_KEY || '').trim();
  const live = (process.env.STRIPE_SECRET_KEY_LIVE || '').trim();
  const test = (process.env.STRIPE_SECRET_KEY_TEST || '').trim();

  if (isLocalHost(host)) return test || primary;
  return live || primary;
}

export async function POST(req: Request) {
  const envBase = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  const host =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    'localhost:3000';
  const stripeSecret = pickStripeSecret(host);
  if (!stripeSecret) {
    return NextResponse.json(
      {
        error:
          'Missing Stripe key. Set STRIPE_SECRET_KEY (or STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST).',
      },
      { status: 500 }
    );
  }
  if (!isLocalHost(host) && stripeSecret.startsWith('sk_test_')) {
    return NextResponse.json(
      {
        error:
          'Production checkout is using a Stripe test key. Configure STRIPE_SECRET_KEY_LIVE (or replace STRIPE_SECRET_KEY with an sk_live key).',
      },
      { status: 500 }
    );
  }

  const proto =
    req.headers.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https');
  const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;

  const successUrl = new URL('/donate/success', base).toString();
  const cancelUrl = new URL('/expansion?canceled=1', base).toString();

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
            product_data: { name: 'ICFC Masjid Expansion' },
            unit_amount: Math.round(amountCents),
          },
          quantity: 1,
        },
      ],
      customer_email: donorEmail || undefined,
      metadata: {
        fund: 'masjid_expansion',
        campaign: 'expansion_page',
        recurrence,
        donorName,
        donorEmail,
        note: 'Masjid expansion donation',
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
