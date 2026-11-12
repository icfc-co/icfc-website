import { NextRequest, NextResponse } from 'next/server';
import { ageAt, amountFor, loadActivePricing, typeForAge } from '@/lib/membershipPricing';
import { getAuthUser } from '@/lib/auth-user';
import { membershipById, stripeClient, RENEW_WINDOW_DAYS } from '@/lib/membership-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


function computeBaseUrl(req: Request, envBase?: string) {
  const trimmed = (envBase || '').trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { user, service: supabaseAdmin } = auth;

    const body = await req.json().catch(() => ({} as { household_id?: string }));
    const state = await membershipById(supabaseAdmin, user, body.household_id);
    if (!state) return NextResponse.json({ error: 'Membership not found.' }, { status: 404 });
    // Never start a second subscription, and only renew near or after the end date
    if (!state.isPrimary) {
      return NextResponse.json({ error: 'Only the household’s primary contact can renew.' }, { status: 403 });
    }
    if (state.autoRenew) {
      return NextResponse.json({ error: 'Your membership already renews automatically.' }, { status: 409 });
    }
    if (state.cancelScheduled) {
      return NextResponse.json(
        { error: `Your membership is paid through ${state.endsOn}. Choose "Keep renewing" instead of buying a new one.` },
        { status: 409 }
      );
    }
    if (!state.canRenew) {
      return NextResponse.json(
        { error: `Renewal opens ${RENEW_WINDOW_DAYS} days before your membership ends (${state.endsOn}).` },
        { status: 409 }
      );
    }
    const hh = state.household;

    const { data: members, error: memErr } = await supabaseAdmin
      .from('membership_members')
      .select('*')
      .eq('household_id', hh.id);
    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });
    if (!members?.length) return NextResponse.json({ error: 'No members to renew' }, { status: 400 });

    const base = computeBaseUrl(req, process.env.NEXT_PUBLIC_SITE_URL);
    const success_url = new URL('/modules/registration/membership/thanks', base).toString() + '?session_id={CHECKOUT_SESSION_ID}';
    const cancel_url  = new URL('/modules/registration/membership/manage?canceled=1', base).toString(); // fixed

    const pricing = await loadActivePricing(supabaseAdmin);

    // Age everyone to today and re-price: youth past the youth max age renew as regular
    const renewed = (members as any[]).map((m: any) => {
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

    const session = await stripeClient().checkout.sessions.create({
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
