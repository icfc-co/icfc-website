import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

function computeBaseUrl(req: Request, envBase?: string) {
  const trimmed = (envBase || '').trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function findLatestHouseholdByUserOrEmail(supabase: any, uid: string, email?: string) {
  let { data: hh } = await supabase
    .from('membership_households')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hh) return hh;

  if (email) {
    const { data: hhByEmail } = await supabase
      .from('membership_households')
      .select('*')
      .ilike('primary_email', email.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (hhByEmail) return hhByEmail;
  }
  return null;
}

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

    const hh = await findLatestHouseholdByUserOrEmail(supabase, user.id, user.email || undefined);
    if (!hh) return NextResponse.json({ error: 'No membership household found' }, { status: 404 });

    const { data: members, error: memErr } = await supabase
      .from('membership_members')
      .select('*')
      .eq('household_id', hh.id);
    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });
    if (!members?.length) return NextResponse.json({ error: 'No members to renew' }, { status: 400 });

    const base = computeBaseUrl(req, process.env.NEXT_PUBLIC_SITE_URL);
    const success_url = new URL('/modules/membership/thanks', base).toString() + '?session_id={CHECKOUT_SESSION_ID}';
    const cancel_url  = new URL('/modules/registration/membership/manage?canceled=1', base).toString(); // fixed

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
        renewal_of_household_id: String(hh.id),
        primary_name: hh.primary_name || '',
        primary_email: hh.primary_email || '',
        primary_phone: hh.primary_phone || '',
        members_json: JSON.stringify(
          members.map((m: any) => ({ name: m.name, age: m.age, phone: m.phone, email: m.email }))
        ),
        total_cents: String(members.reduce((s: number, m: any) => s + Number(m.price_cents || 0), 0)),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('renew error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
