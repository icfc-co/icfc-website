// Server-only: the membership a signed-in user manages, and what they may do with it.
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

/** Newest active household (else newest of any), with live Stripe subscription details. */
export async function membershipFor(service: SupabaseClient, user: User): Promise<MembershipState | null> {
  const list = (await householdsFor(service, user)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!list.length) return null;
  // Prefer an active household with a live subscription: if someone also bought a
  // one-time membership, they must still see (and be able to cancel) the renewal.
  const household =
    list.find((h) => isActive(h) && !!h.stripe_subscription_id && LIVE_SUB.includes(h.subscription_status ?? '')) ??
    list.find(isActive) ??
    list[0];

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
