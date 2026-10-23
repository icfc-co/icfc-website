import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { ageAt, amountFor, loadActivePricing, typeForAge } from '@/lib/membershipPricing';

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
    const success_url = new URL('/modules/registration/membership/thanks', base).toString() + '?session_id={CHECKOUT_SESSION_ID}';
    const cancel_url  = new URL('/modules/registration/membership/manage?canceled=1', base).toString(); // fixed

    // Service role: pricing + checkout payloads (guests' payload rows aren't reachable through RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const pricing = await loadActivePricing(supabaseAdmin);

    // Age everyone to today and re-price: youth past the youth max age renew as regular
    const renewed = members.map((m: any) => {
      const age = ageAt(Number(m.age || 0), m.age_updated_at ?? m.created_at);
      const membership_type = typeForAge(m.membership_type, age, pricing);
      return { ...m, age, membership_type, price_cents: amountFor(membership_type, age, pricing) };
    });

    const line_items = renewed.map((m: any, idx: number) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: `Yearly Membership — ${m.name} (${m.membership_type})`, metadata: { index: String(idx) } },
        unit_amount: m.price_cents,
        recurring: { interval: 'year' as const },
      },
      quantity: 1,
    }));

    const total_cents = renewed.reduce((s: number, m: any) => s + Number(m.price_cents || 0), 0);

    // Store the full member snapshot (type, designation, sex, ...) the same way new checkouts do,
    // so the webhook doesn't fall back to members_json and default everyone to "regular".
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('membership_checkout_payloads')
      .insert({
        user_id: user.id,
        payload: {
          primary: { name: hh.primary_name || '', email: hh.primary_email || '', phone: hh.primary_phone || '' },
          members: renewed.map((m: any) => ({
            name: m.name,
            age: m.age,
            sex: m.sex ?? undefined,
            email: m.email ?? undefined,
            phone: m.phone ?? undefined,
            membership_type: m.membership_type,
            designation: m.designation ?? undefined,
          })),
          recurrence: 'yearly',
          total_cents,
          user_id: user.id,
          origin: base,
          renewal_of_household_id: hh.id,
        },
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      console.error('renew payload insert error', insertErr);
      return NextResponse.json({ error: 'Failed to persist renewal payload.' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url,
      cancel_url,
      customer_email: hh.primary_email || undefined,
      line_items,
      metadata: {
        fund: 'membership',
        payload_id: inserted.id as string,
        user_id: user.id,
        renewal_of_household_id: String(hh.id),
        recurrence: 'yearly',
        members_count: String(members.length),
        total_cents: String(total_cents),
        primary_name: (hh.primary_name || '').substring(0, 80),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('renew error', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
