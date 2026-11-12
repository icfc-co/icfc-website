import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-user';
import { membershipFor, RENEW_WINDOW_DAYS } from '@/lib/membership-status';

export const dynamic = 'force-dynamic';

// GET: the signed-in user's membership, its members and the actions available
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const state = await membershipFor(auth.service, auth.user);
  if (!state) return NextResponse.json({ membership: null });

  const { data: members } = await auth.service
    .from('membership_members')
    .select('id, name, age, membership_type, designation, price_cents, member_uid')
    .eq('household_id', state.household.id)
    .order('created_at', { ascending: true });

  const h = state.household;
  return NextResponse.json({
    membership: {
      primary_name: h.primary_name,
      primary_email: h.primary_email,
      primary_phone: h.primary_phone,
      start_date: h.start_date,
      endsOn: state.endsOn,
      daysLeft: state.daysLeft,
      isPrimary: state.isPrimary,
      autoRenew: state.autoRenew,
      cancelScheduled: state.cancelScheduled,
      expired: state.expired,
      revoked: state.revoked,
      canRenew: state.canRenew,
      canCancel: state.canCancel,
      canResume: state.canResume,
      renewWindowDays: RENEW_WINDOW_DAYS,
    },
    members: members ?? [],
  });
}
