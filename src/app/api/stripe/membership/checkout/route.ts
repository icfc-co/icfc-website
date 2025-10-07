// src/app/api/stripe/membership/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
    const user_id = (body?.user_id as string | undefined) || undefined; // optional, may be undefined for guests

    if (!members.length || !members[0]?.name) {
      return NextResponse.json({ error: 'Primary member missing.' }, { status: 400 });
    }

    // Supabase admin client (service role) – required because guests can checkout
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load active pricing
    const { data: pricing, error: priceErr } = await supabaseAdmin
      .from('membership_pricing')
      .select('type, amount_cents, min_age, max_age')
      .eq('is_active', true);

    if (priceErr || !pricing?.length) {
      console.error('Pricing fetch error:', priceErr);
      return NextResponse.json({ error: 'Pricing not available' }, { status: 500 });
    }
    const priceMap: Record<string, any> = Object.fromEntries(
      pricing.map((p: any) => [p.type, p])
    );

    const amountFor = (t: MemberType, age: number) => {
      const row = priceMap[t];
      if (!row) return 0;
      if (t === 'youth' && row.max_age != null && age > row.max_age) {
        const reg = priceMap['regular'];
        return reg ? reg.amount_cents : 0;
      }
      return row.amount_cents;
    };

    // Build absolute URLs (works on prod and localhost)
    const envBase = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
    const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;

    const success_url =
      new URL('/modules/registration/membership/thanks', base).toString() +
      '?session_id={CHECKOUT_SESSION_ID}';
    const cancel_url = new URL('/modules/registration/membership?canceled=1', base).toString();

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

    // Stripe line items (skip $0)
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
            // keep product metadata tiny (Stripe 500-char value limit)
            metadata: { idx: String(i), desig: m.designation! },
          },
          unit_amount: unit,
          ...(isRecurring ? { recurring: { interval: 'year' as const } } : {}),
        },
        quantity: 1,
      });
    }

    const total_cents = normalizedMembers.reduce(
      (s, m) => s + amountFor(m.membership_type, m.age),
      0
    );

    // Persist the *full* payload to Supabase; Stripe metadata only receives a tiny reference
    const payloadToStore = {
      primary,
      members: normalizedMembers,
      recurrence,
      total_cents,
      // optionally include any ui/context info you need later:
      user_id: user_id ?? null,
      origin: base,
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('membership_checkout_payloads')
      .insert({ user_id: user_id ?? null, payload: payloadToStore })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('Payload insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to persist checkout payload.' }, { status: 500 });
    }

    const payloadId = inserted.id as string;
    const primaryEmail = primary?.email || normalizedMembers[0]?.email || undefined;
    const primaryName = primary?.name || normalizedMembers[0]?.name || '';

    // Create Stripe Checkout Session with *small* metadata
    const session = await stripe.checkout.sessions.create({
      mode: isRecurring ? 'subscription' : 'payment',
      success_url,
      cancel_url,
      customer_email: primaryEmail,
      line_items,
      metadata: {
        fund: 'membership',
        payload_id: payloadId,               // short reference to DB
        user_id: user_id ?? '',              // optional
        recurrence,
        members_count: String(normalizedMembers.length),
        total_cents: String(total_cents),
        primary_name: primaryName.substring(0, 80), // keep values short
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('checkout error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
