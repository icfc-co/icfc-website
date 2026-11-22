-- Membership prices for the 2026–27 season (registration reopens):
--   regular $50, student $25, senior $25, youth (under 18) free.
-- Old rows are kept (inactive) as history; age limits carry over from them.
-- New memberships and manual renewals use these immediately. Existing
-- auto-renewing subscriptions move to them at their next renewal (the Stripe
-- webhook's invoice.upcoming step re-prices each member's line).

BEGIN;

CREATE TEMP TABLE old_prices ON COMMIT DROP AS
  SELECT type, min_age, max_age FROM public.membership_pricing WHERE is_active;

-- uq_membership_pricing_type_active allows one active row per type
UPDATE public.membership_pricing SET is_active = false WHERE is_active;

INSERT INTO public.membership_pricing (type, amount_cents, min_age, max_age, is_active, effective_at)
SELECT n.type, n.amount_cents, o.min_age, o.max_age, true, now()
FROM (VALUES ('regular', 5000), ('student', 2500), ('senior', 2500), ('youth', 0)) AS n(type, amount_cents)
LEFT JOIN old_prices o ON o.type = n.type;

COMMIT;
