-- Community Support Network: members ask for help (rides, groceries, meals,
-- laundry, chores) and other members accept and reply. Staff (volunteer,
-- admin, super_admin) monitor everything.
--
-- All reads/writes go through /api/support-network (service role), which
-- decides what each caller may see (contact details are only shared between
-- the requester and the member who accepted). RLS is on with no policies so
-- the tables are closed to anon/authenticated API callers.

CREATE TABLE IF NOT EXISTS public.support_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  requester_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- person who needs the help (may be a family member of the requester)
  recipient_name     text NOT NULL,
  for_self           boolean NOT NULL DEFAULT true,
  contact_phone      text NOT NULL,
  contact_email      text,
  area               text NOT NULL,          -- general location, shown to members
  address            text,                   -- full address, shared only after accept

  help_types         text[] NOT NULL,
  other_help         text,
  urgency            text NOT NULL DEFAULT 'flexible',
  needed_on          date,
  time_window        text,
  details            text NOT NULL,
  preferred_helper   text NOT NULL DEFAULT 'any',   -- any | Female | Male

  status             text NOT NULL DEFAULT 'open',
  helper_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  helper_name        text,
  helper_phone       text,
  accepted_at        timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  staff_notes        text,

  CONSTRAINT support_requests_help_types_chk CHECK (
    cardinality(help_types) > 0 AND
    help_types <@ ARRAY['ride','groceries','meals','laundry','chores','other']::text[]
  ),
  CONSTRAINT support_requests_urgency_chk CHECK (urgency IN ('urgent','this_week','flexible')),
  CONSTRAINT support_requests_status_chk CHECK (status IN ('open','accepted','completed','cancelled')),
  CONSTRAINT support_requests_pref_chk CHECK (preferred_helper IN ('any','Female','Male')),
  CONSTRAINT support_requests_helper_chk CHECK (status <> 'accepted' OR helper_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS support_requests_status_idx    ON public.support_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_requests_requester_idx ON public.support_requests (requester_id);
CREATE INDEX IF NOT EXISTS support_requests_helper_idx    ON public.support_requests (helper_id);

CREATE TABLE IF NOT EXISTS public.support_request_replies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  author_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name  text NOT NULL,
  author_role  text NOT NULL DEFAULT 'member',   -- member | staff
  body         text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_request_replies_req_idx
  ON public.support_request_replies (request_id, created_at);

DROP TRIGGER IF EXISTS support_requests_updated_at ON public.support_requests;
CREATE TRIGGER support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_request_replies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_requests        FROM anon, authenticated;
REVOKE ALL ON public.support_request_replies FROM anon, authenticated;
GRANT ALL ON public.support_requests        TO service_role;
GRANT ALL ON public.support_request_replies TO service_role;
