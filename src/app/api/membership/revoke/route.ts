import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-user';
import { membershipById, stripeClient } from '@/lib/membership-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { household_id, action: 'cancel' | 'resume' }
//  - Auto-renewing membership: cancel (or undo cancelling) the Stripe subscription at the
//    end of the paid period. Membership stays active until then; the webhook syncs status.
//  - One-time membership: cancel ends it today (status 'revoked').
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

    const body = await req.json().catch(() => ({} as { action?: string; household_id?: string }));
    const state = await membershipById(auth.service, auth.user, body.household_id);
    if (!state) return NextResponse.json({ error: 'Membership not found.' }, { status: 404 });
    if (!state.isPrimary) {
      return NextResponse.json({ error: 'Only the household’s primary contact can change the membership.' }, { status: 403 });
    }

    const action = body.action === 'resume' ? 'resume' : 'cancel';
    const sub = state.subscription;

    if (action === 'resume') {
      if (!state.canResume || !sub) return NextResponse.json({ error: 'Nothing to resume.' }, { status: 400 });
      await stripeClient().subscriptions.update(sub.id, { cancel_at_period_end: false });
      return NextResponse.json({ ok: true });
    }

    if (!state.canCancel) return NextResponse.json({ error: 'This membership cannot be cancelled.' }, { status: 400 });

    if (state.autoRenew && !sub) {
      return NextResponse.json({ error: 'We could not reach the payment system. Please try again in a few minutes.' }, { status: 503 });
    }
    if (state.autoRenew && sub) {
      await stripeClient().subscriptions.update(sub.id, { cancel_at_period_end: true });
      return NextResponse.json({ ok: true, endsOn: state.endsOn });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await auth.service
      .from('membership_households')
      .update({ status: 'revoked', end_date: today })
      .eq('id', state.household.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, endsOn: today });
  } catch (e) {
    console.error('membership cancel error', e);
    return NextResponse.json({ error: (e as Error).message || 'Server error' }, { status: 500 });
  }
}
