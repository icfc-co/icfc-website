-- Announcements from admins / super admins (/admin/announcements).
--   audience = 'public'  -> shown on the home page (no email)
--   audience = 'members' -> shown on the member dashboard / My Profile and
--                           emailed to every active member (unsubscribes are
--                           skipped unless the announcement is marked important)
-- Emails are queued in announcement_deliveries and sent in small batches by
-- /api/admin/announcements/[id]/send. All access goes through the API with the
-- service role; RLS is on with no policies.

CREATE TABLE IF NOT EXISTS public.announcements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name  text,

  title            text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  body             text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 10000),
  audience         text NOT NULL CHECK (audience IN ('public','members')),
  important        boolean NOT NULL DEFAULT false,
  published        boolean NOT NULL DEFAULT true,   -- false = hidden from the website
  expires_at       timestamptz,                     -- hidden from the website after this

  -- email (members only)
  email_requested  boolean NOT NULL DEFAULT false,
  emailed_at       timestamptz                      -- when sending finished
);

CREATE INDEX IF NOT EXISTS announcements_live_idx ON public.announcements (audience, published, created_at DESC);

CREATE TABLE IF NOT EXISTS public.announcement_deliveries (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id  uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  email            text NOT NULL,
  name             text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  error            text,
  attempts         int NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, email)
);

CREATE INDEX IF NOT EXISTS announcement_deliveries_queue_idx
  ON public.announcement_deliveries (announcement_id, status);

-- Addresses that unsubscribed from announcement emails (lower-cased)
CREATE TABLE IF NOT EXISTS public.announcement_unsubscribes (
  email       text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS announcements_updated_at ON public.announcements;
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.announcements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_deliveries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_unsubscribes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.announcements             FROM anon, authenticated;
REVOKE ALL ON public.announcement_deliveries   FROM anon, authenticated;
REVOKE ALL ON public.announcement_unsubscribes FROM anon, authenticated;
GRANT ALL ON public.announcements             TO service_role;
GRANT ALL ON public.announcement_deliveries   TO service_role;
GRANT ALL ON public.announcement_unsubscribes TO service_role;

-- Claim up to p_limit queued deliveries for sending (safe if two admins resume at once).
-- Rows stuck in 'sending' for 10+ minutes (a crashed batch) are retried.
CREATE OR REPLACE FUNCTION public.claim_announcement_deliveries(p_announcement uuid, p_limit int)
RETURNS SETOF public.announcement_deliveries
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.announcement_deliveries d
  SET status = 'sending', attempts = d.attempts + 1, updated_at = now()
  WHERE d.id IN (
    SELECT id FROM public.announcement_deliveries
    WHERE announcement_id = p_announcement
      AND (status = 'pending' OR (status = 'sending' AND updated_at < now() - interval '10 minutes'))
    ORDER BY id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING d.*;
$$;

REVOKE ALL ON FUNCTION public.claim_announcement_deliveries(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_announcement_deliveries(uuid, int) TO service_role;

-- Email progress per announcement for the admin list
CREATE OR REPLACE FUNCTION public.announcement_delivery_stats(p_ids uuid[])
RETURNS TABLE (announcement_id uuid, total int, sent int, failed int, pending int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT announcement_id,
         count(*)::int,
         count(*) FILTER (WHERE status = 'sent')::int,
         count(*) FILTER (WHERE status = 'failed')::int,
         count(*) FILTER (WHERE status IN ('pending','sending'))::int
  FROM public.announcement_deliveries
  WHERE announcement_id = ANY (p_ids)
  GROUP BY announcement_id;
$$;

REVOKE ALL ON FUNCTION public.announcement_delivery_stats(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.announcement_delivery_stats(uuid[]) TO service_role;
