import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  try {
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
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: hh } = await supabase
      .from('membership_households')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!hh) return NextResponse.json({ error: 'No membership household found' }, { status: 404 });

    const { data: members } = await supabase.from('membership_members').select('*').eq('household_id', hh.id);
    if (!members?.length) return NextResponse.json({ error: 'No members to renew' }, { status: 400 });

    const envBase = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
    const base = /^https?:\/\//i.test(envBase) ? envBase : `${proto}://${host}`;
    const success_url = new URL('/modules/membership/thanks', base).toString() + '?session_id={CHECKOUT_SESSION_ID}';
    const cancel_url  = new URL('/member/manage-membership?canceled=1', base).toString();

    const line_items = members.map((m: any, idx: number) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: `Yearly Membership — ${m.name} (${m.age})`, metadata: { index: String(idx) } },
        unit_amount: m.price_cents,
        recurring: { interval: 'year' },
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url,
      cancel_url,
      customer_email: hh.primary_email || undefined,
      line_items,
      metadata: {
        user_id: user.id,
        primary_name: hh.primary_name || '',
        primary_email: hh.primary_email || '',
        primary_phone: hh.primary_phone || '',
        members_json: JSON.stringify(
          members.map((m: any) => ({ name: m.name, age: m.age, phone: m.phone, email: m.email }))
        ),
        total_cents: String(members.reduce((s: number, m: any) => s + m.price_cents, 0)),
        renewal_of_household_id: hh.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('renew error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
