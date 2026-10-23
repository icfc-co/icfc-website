-- Track the Stripe subscription behind each membership household so the
-- members directory can include subscribers for as long as they stay active.
ALTER TABLE public.membership_households
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,          -- Stripe status: active, past_due, canceled, ...
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;    -- end of the currently paid period

-- Members store the age they gave at a point in time; this records when it was last brought
-- forward (NULL = as of the row's created_at). Renewals age members from here, so youth
-- past the youth max age renew as regular.
ALTER TABLE public.membership_members
  ADD COLUMN IF NOT EXISTS age_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_membership_households_stripe_subscription_id
  ON public.membership_households(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_membership_households_subscription_status
  ON public.membership_households(subscription_status);

-- Members directory source.
--   p_purchased_from NULL      -> every member row (all years, no de-duplication)
--   p_purchased_from set       -> members whose household purchased on/after that time
--                                 OR whose household subscription is 'active' (past_due does not count),
--                                 keeping only the most recent qualifying household per primary email
--   p_qualify                  -> 'any' (default), 'purchase' or 'subscription' to narrow the above
-- Returns membership_members rows so PostgREST can still embed the household relation.
-- SECURITY INVOKER (default): the caller's RLS on the underlying tables still applies.
CREATE OR REPLACE FUNCTION public.members_directory(
  p_purchased_from TIMESTAMPTZ DEFAULT NULL,
  p_qualify TEXT DEFAULT 'any'
)
RETURNS SETOF public.membership_members
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT m.*
  FROM public.membership_members m
  WHERE p_purchased_from IS NULL
     OR m.household_id IN (
       SELECT DISTINCT ON (COALESCE(LOWER(TRIM(h.primary_email)), h.id::text)) h.id
       FROM public.membership_households h
       WHERE (COALESCE(p_qualify, 'any') IN ('any', 'purchase') AND h.created_at >= p_purchased_from)
          OR (COALESCE(p_qualify, 'any') IN ('any', 'subscription') AND h.subscription_status = 'active')
       ORDER BY COALESCE(LOWER(TRIM(h.primary_email)), h.id::text), h.created_at DESC
     );
$$;

COMMENT ON FUNCTION public.members_directory(TIMESTAMPTZ, TEXT)
  IS 'Admin members directory: current-season purchases plus active subscriptions, latest household per primary email';
