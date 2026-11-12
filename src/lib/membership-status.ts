// Server-only: the memberships a signed-in user manages, and what they may do with each.
import Stripe from 'stripe';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { HouseholdRow, householdsFor, isActive, isPrimaryOf } from '@/lib/membership-access';

// Renewal opens this many days before the membership ends (the new year starts on the renewal day)
export const RENEW_WINDOW_DAYS = 30;

export const stripeClient = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });

const LIVE_SUB = ['active', 'trialing', 'past_due'];

export type MembershipState = {
  household: HouseholdRow;
  isPrimary: boolean;
  /** Stripe subscription that will charge again */
  autoRenew: boolean;
  /** Subscription is set to end at the period end (cancelled, still paid up) */
  cancelScheduled: boolean;
  /** Last day of membership (YYYY-MM-DD) */
  endsOn: string | null;
  daysLeft: number | null;
  expired: boolean;
  revoked: boolean;
  canRenew: boolean;
  canCancel: boolean;
  canResume: boolean;
  subscription: Stripe.Subscription | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

const hasLiveSub = (h: HouseholdRow) => !!h.stripe_subscription_id && LIVE_SUB.includes(h.subscription_status ?? '');

/**
 * Every current membership the user has (a person may hold a subscription and a
 * one-time purchase, or two subscriptions), each with its own status and actions.
 * Subscriptions first, then newest. With nothing current, the most recent one.
 */
export async function membershipsFor(service: SupabaseClient, user: User): Promise<MembershipState[]> {
  const list = (await householdsFor(service, user)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!list.length) return [];
  const current = list.filter((h) => isActive(h) || hasLiveSub(h));
  const chosen = (current.length ? current : [list[0]]).sort(
    (a, b) => Number(hasLiveSub(b)) - Number(hasLiveSub(a)) || b.created_at.localeCompare(a.created_at)
  );
  return Promise.all(chosen.map((h) => stateOf(h, user)));
}

/** One of the user's memberships by household id, or null if it isn't theirs. */
export async function membershipById(service: SupabaseClient, user: User, householdId: unknown) {
  if (typeof householdId !== 'string') return null;
  const list = await householdsFor(service, user);
  const h = list.find((x) => x.id === householdId);
  return h ? stateOf(h, user) : null;
}

async function stateOf(household: HouseholdRow, user: User): Promise<MembershipState> {
  let subscription: Stripe.Subscription | null = null;
  if (household.stripe_subscription_id) {
    try {
      subscription = await stripeClient().subscriptions.retrieve(household.stripe_subscription_id);
    } catch {
      subscription = null;
    }
  }

  // If Stripe can't be reached, trust the status the webhook saved, so an
  // auto-renewing member is never offered a second subscription.
  const live = subscription
    ? LIVE_SUB.includes(subscription.status)
    : !!household.stripe_subscription_id && LIVE_SUB.includes(household.subscription_status ?? '');
  const cancelScheduled = live && !!subscription?.cancel_at_period_end;
  const autoRenew = live && !cancelScheduled;
  const periodEnd = subscription
    ? ((subscription as unknown as { current_period_end?: number }).current_period_end ??
      subscription.items?.data?.[0]?.current_period_end ??
      null)
    : null;
  const endsOn = periodEnd
    ? new Date(periodEnd * 1000).toISOString().slice(0, 10)
    : live && household.current_period_end
      ? household.current_period_end.slice(0, 10)
      : household.end_date;

  const revoked = household.status === 'revoked';
  const daysLeft = endsOn ? daysBetween(today(), endsOn) : null;
  const expired = !live && (revoked || (endsOn != null && endsOn < today()));
  const isPrimary = isPrimaryOf(household, user);

  return {
    household,
    isPrimary,
    autoRenew,
    cancelScheduled,
    endsOn,
    daysLeft,
    expired,
    revoked,
    canRenew: isPrimary && !live && (expired || (daysLeft != null && daysLeft <= RENEW_WINDOW_DAYS)),
    canCancel: isPrimary && (autoRenew || (!live && !expired)),
    canResume: isPrimary && cancelScheduled,
    subscription,
  };
}
