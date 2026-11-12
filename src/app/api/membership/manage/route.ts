import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-user';
import { MembershipState, membershipsFor, RENEW_WINDOW_DAYS } from '@/lib/membership-status';

export const dynamic = 'force-dynamic';

function toJson(s: MembershipState) {
  const h = s.household;
  return {
    id: h.id,
    primary_name: h.primary_name,
    primary_email: h.primary_email,
    primary_phone: h.primary_phone,
    start_date: h.start_date,
    endsOn: s.endsOn,
    daysLeft: s.daysLeft,
    isPrimary: s.isPrimary,
    isSubscription: !!h.stripe_subscription_id,
    autoRenew: s.autoRenew,
    cancelScheduled: s.cancelScheduled,
    expired: s.expired,
    revoked: s.revoked,
    canRenew: s.canRenew,
    canCancel: s.canCancel,
    canResume: s.canResume,
    renewWindowDays: RENEW_WINDOW_DAYS,
  };
}

// GET: every current membership of the signed-in user, with members and available actions
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const states = await membershipsFor(auth.service, auth.user);
  if (!states.length) return NextResponse.json({ memberships: [] });

  const { data: members } = await auth.service
    .from('membership_members')
    .select('id, household_id, name, age, membership_type, designation, price_cents, member_uid')
    .in('household_id', states.map((s) => s.household.id))
    .order('created_at', { ascending: true });

  return NextResponse.json({
    memberships: states.map((s) => ({
      ...toJson(s),
      members: (members ?? [])
        .filter((m) => m.household_id === s.household.id)
        .map((m) => ({
          id: m.id, name: m.name, age: m.age, membership_type: m.membership_type,
          designation: m.designation, price_cents: m.price_cents, member_uid: m.member_uid,
        })),
    })),
  });
}
