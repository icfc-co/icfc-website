-- Security fixes (2026-10-27)
-- Supabase Security Advisor:
--   * rls_disabled_in_public: forms, user_notifications, processed_events
--   * security_definer_view:  admin_donations, membership_households_effective
-- Found while reviewing live policies (all reachable with the public anon key):
--   * user_roles: users could insert any role (incl. super_admin) for themselves
--   * membership_households / membership_members / profiles: readable by anyone
--   * donations / bank_confirmations / zelle_confirmations: anyone could insert
--   * photos: any signed-in user could insert, update or delete
--   * ramadan_volunteers: policies checked jwt 'role' (always 'authenticated')

-- ---------------------------------------------------------------------------
-- 1) Enable RLS with no policies: clients get nothing, the service role
--    (webhook, server routes) bypasses RLS. None are read from the browser.
-- ---------------------------------------------------------------------------
ALTER TABLE public.processed_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms              ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Views run with the caller's permissions so underlying RLS applies.
--    admin_donations is only read by /api/admin/donations (service role).
-- ---------------------------------------------------------------------------
ALTER VIEW public.admin_donations                SET (security_invoker = true);
ALTER VIEW public.membership_households_effective SET (security_invoker = true);

REVOKE ALL ON public.admin_donations FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) user_roles: a client may only give itself the base 'user' role (what
--    /login does on first sign-in). Other roles come from set_user_role
--    (super admin) or the SECURITY DEFINER service/sync functions.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Assign role to self"            ON public.user_roles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.user_roles;

CREATE POLICY "insert own base user role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role_id = (SELECT id FROM public.roles WHERE name = 'user')
  );

-- ---------------------------------------------------------------------------
-- 4) Membership data: owner (by user_id or exact email) and admins only.
--    ~~* (ILIKE) treated '_' and '%' in emails as wildcards; compare exactly.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.membership_households;
DROP POLICY IF EXISTS "household select by owner or email" ON public.membership_households;
DROP POLICY IF EXISTS "household update by owner or email" ON public.membership_households;

CREATE POLICY "household select by owner or email" ON public.membership_households
  FOR SELECT USING (user_id = auth.uid() OR lower(trim(primary_email)) = lower(auth.email()));
CREATE POLICY "household update by owner or email" ON public.membership_households
  FOR UPDATE USING (user_id = auth.uid() OR lower(trim(primary_email)) = lower(auth.email()));

DROP POLICY IF EXISTS "Enable read access for all users" ON public.membership_members;
DROP POLICY IF EXISTS "owner read own members"           ON public.membership_members;

-- Includes households matched by email, which /membership/manage and /renew fall back to.
CREATE POLICY "owner read own members" ON public.membership_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.membership_households hh
      WHERE hh.id = membership_members.household_id
        AND (hh.user_id = auth.uid() OR lower(trim(hh.primary_email)) = lower(auth.email()))
    )
  );

-- ---------------------------------------------------------------------------
-- 5) profiles: own row only (forgot-password no longer looks profiles up).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow select by email for public" ON public.profiles;

CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 6) Donations are only created server-side with the service role.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS donations_insert_any ON public.donations;
DROP POLICY IF EXISTS bank_insert_any      ON public.bank_confirmations;
DROP POLICY IF EXISTS zelle_insert_any     ON public.zelle_confirmations;

-- ---------------------------------------------------------------------------
-- 7) photos: public read stays; writes limited to the roles that reach
--    /photo-manager (admin, super-admin and volunteer dashboards).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.photos;
DROP POLICY IF EXISTS "update photos (auth only)"                  ON public.photos;
DROP POLICY IF EXISTS photos_delete_auth                           ON public.photos;

CREATE POLICY "staff insert photos" ON public.photos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'volunteer']));
CREATE POLICY "staff update photos" ON public.photos
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'super_admin', 'volunteer']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'volunteer']));
CREATE POLICY "staff delete photos" ON public.photos
  FOR DELETE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'super_admin', 'volunteer']));

-- ---------------------------------------------------------------------------
-- 8) ramadan_volunteers: sign-ups go through /api/ramadan/volunteers
--    (service role), so no direct client inserts. Use real role checks.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow insert for anyone"                                ON public.ramadan_volunteers;
DROP POLICY IF EXISTS "Allow read for admin, super-admin, and volunteer roles" ON public.ramadan_volunteers;
DROP POLICY IF EXISTS "Allow update for admin and super-admin"                 ON public.ramadan_volunteers;

CREATE POLICY "staff read ramadan volunteers" ON public.ramadan_volunteers
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'super_admin', 'volunteer']));
-- Volunteers get a read-only table (canEdit=false on /volunteer/ramadan-volunteers)
CREATE POLICY "admins update ramadan volunteers" ON public.ramadan_volunteers
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin', 'super_admin']))
  WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin']));
