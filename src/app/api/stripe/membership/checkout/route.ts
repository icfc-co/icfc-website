// src/app/api/stripe/membership/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

type Recurrence = 'one_time' | 'yearly';
type Sex = 'male' | 'female';
type MemberType = 'student' | 'senior' | 'regular' | 'youth';

type Designation =
  | 'head_of_household'
  | 'spouse'
  | 'father_or_father_in_law'
  | 'mother_or_mother_in_law'
  | 'son_or_son_in_law'
  | 'daughter_or_daughter_in_law'
  | 'other';

type Member = {
  name: string;
  age: number;
  sex: Sex;
  email?: string;
  phone?: string;
  membership_type: MemberType;
  designation?: Designation;
};

// Force HoH on the first member; sanitize others
const normalizeDesignation = (raw: any, isPrimary: boolean): Designation => {
  if (isPrimary) return 'head_of_household';
  const val = String(raw || '').toLowerCase().trim();
  const allowed: Designation[] = [
    'head_of_household',
    'spouse',
    'father_or_father_in_law',
    'mother_or_mother_in_law',
    'son_or_son_in_law',
    'daughter_or_daughter_in_law',
    'other',
  ];
  return (allowed as string[]).includes(val) ? (val as Designation) : 'other';
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const primary = body?.primary as { name: string; email?: string; phone?: string } | null;
    const members = (body?.members as Member[]) || [];
    const recurrence: Recurrence = (body?.recurrence as Recurrence) || 'one_time';

    if (!members.length || !members[0]?.name) {
      return NextResponse.json({ error: 'Primary member missing.' }, { status: 400 });
    }

    // Supabase client (for auth + pricing read)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (k) => cookieStore.get(k)?.value,
          set: (k, v, o) => cookieStore.set(k, v, o),
          remove: (k, o) => cookieStore.set(k, '', { ...o, maxAge: 0 }),
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // Load active pricing
    const { data: pricing, error: priceErr } = await supabase
      .from('membership_pricing')
      .select('type, amount_cents, min_age, max_age')
      .eq('is_active', true);

    if (priceErr || !pricing?.length) {
      return NextResponse.json({ error: 'Pricing not available' }, { status: 500 });
    }
    const priceMap = Object.fromEntries(pricing.map((p: any) => [p.type, p]));

    const amountFor = (t: MemberType, age: number) => {
      const row = priceMap[t];
      if (!row) return 0;
      if (t === 'youth' && row.max_age != null && age > row.max_age) {
        const reg = priceMap['regular'];
        return reg ? reg.amount_cents : 0;
      }
      return row.amount_cents;
    };

    // URLs
    const envBase = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
    const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;
    const success_url =
      new URL('/modules/registration/membership/thanks', base).toString() +
      '?session_id={CHECKOUT_SESSION_ID}';
    const cancel_url = new URL('/modules/registration/membership?canceled=1', base).toString();

    // Recurring means yearly
    const isRecurring = recurrence === 'yearly';

    // Normalize members (names, emails, designation)
    const normalizedMembers: Member[] = members.map((m, i) => ({
      name: String(m.name || '').trim(),
      age: Number(m.age || 0),
      sex: m.sex,
      email: m.email ? String(m.email).toLowerCase().trim() : undefined,
      phone: m.phone || undefined,
      membership_type: m.membership_type,
      designation: normalizeDesignation(m.designation, i === 0),
    }));

    // Build Stripe line items; skip $0
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (let i = 0; i < normalizedMembers.length; i++) {
      const m = normalizedMembers[i];
      const unit = amountFor(m.membership_type, m.age);
      if (unit <= 0) continue;

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Membership — ${m.name} (${m.membership_type})`,
            metadata: { index: String(i), designation: m.designation! },
          },
          unit_amount: unit,
          ...(isRecurring ? { recurring: { interval: 'year' as const } } : {}),
        },
        quantity: 1,
      });
    }

    const totalCents = normalizedMembers.reduce(
      (s, m) => s + amountFor(m.membership_type, m.age),
      0
    );

    // IMPORTANT: send VERBOSE members_json for webhook compatibility
    const session = await stripe.checkout.sessions.create({
      mode: isRecurring ? 'subscription' : 'payment',
      success_url,
      cancel_url,
      customer_email: primary?.email || normalizedMembers[0]?.email || undefined,
      line_items,
      metadata: {
        fund: 'membership',
        user_id: user?.id ?? '',
        primary_name: normalizedMembers[0]?.name || '',
        primary_email: normalizedMembers[0]?.email || '',
        primary_phone: normalizedMembers[0]?.phone || '',
        recurrence,
        members_json: JSON.stringify(normalizedMembers),
        total_cents: String(totalCents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('checkout error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
