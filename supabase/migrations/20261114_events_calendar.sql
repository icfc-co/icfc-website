-- Community calendar: admin-posted events with optional posters and
-- event-specific donations (Stripe, Zelle and bank, like the donate page).
--
-- * events: readable by everyone except drafts; written only through
--   /api/admin/events (service role, admins only).
-- * donations.event_id links a gift to an event (fund = 'event').
-- * event_donation_totals(): public per-event totals of succeeded gifts, for
--   progress bars, without exposing donor rows.
-- * Storage bucket 'event-posters' (public read; uploads use signed URLs from
--   the admin API).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  title                text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description          text,
  location             text,
  category             text NOT NULL DEFAULT 'community',
  starts_at            timestamptz NOT NULL,
  ends_at              timestamptz,
  all_day              boolean NOT NULL DEFAULT false,
  poster_path          text,          -- object path in the event-posters bucket

  status               text NOT NULL DEFAULT 'published',
  donations_enabled    boolean NOT NULL DEFAULT false,
  donation_goal_cents  integer CHECK (donation_goal_cents IS NULL OR donation_goal_cents > 0),

  CONSTRAINT events_status_chk CHECK (status IN ('published', 'cancelled', 'draft')),
  CONSTRAINT events_time_chk   CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at);

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;

DROP POLICY IF EXISTS "public reads listed events" ON public.events;
CREATE POLICY "public reads listed events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status <> 'draft');

-- ---------------------------------------------------------------------------
-- 2) Donations linked to an event
-- ---------------------------------------------------------------------------
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS donations_event_id_idx ON public.donations (event_id);

-- If donations.fund has a fixed list of allowed values, allow 'event' too.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.donations'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%fund%'
  LOOP
    IF c.def NOT ILIKE '%''event''%' THEN
      EXECUTE format('ALTER TABLE public.donations DROP CONSTRAINT %I', c.conname);
      IF NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid = 'public.donations'::regclass
                       AND conname = 'donations_fund_format_chk') THEN
        ALTER TABLE public.donations
          ADD CONSTRAINT donations_fund_format_chk CHECK (fund ~ '^[a-z0-9_]+$');
      END IF;
      RAISE NOTICE 'Replaced % (%) with a format check', c.conname, c.def;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.event_donation_totals()
RETURNS TABLE (event_id uuid, total_cents bigint, gifts bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.event_id, coalesce(sum(d.amount_cents), 0)::bigint, count(*)::bigint
  FROM donations d
  JOIN events e ON e.id = d.event_id AND e.status <> 'draft'
  WHERE d.status = 'succeeded'
  GROUP BY d.event_id;
$$;
REVOKE EXECUTE ON FUNCTION public.event_donation_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_donation_totals() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Poster storage (public read; 10 MB images)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-posters', 'event-posters', true, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
