-- Roles & database function hardening (follows 20261027_security_advisor_fixes.sql)
--
-- Role model: one row per user in user_roles (unique on user_id), ranked
--   super_admin > admin > volunteer > teacher > student > member > user
-- 'user' and 'member' are managed automatically from membership data
-- (sync_member_role); every other role is assigned by a super admin
-- (set_user_role).

-- ---------------------------------------------------------------------------
-- 1) sync_member_role only switches between 'user' and 'member'. Before, it
--    also overwrote volunteer/teacher/student whenever a household changed,
--    and anyone could call it with any user id + email.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_member_role(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_current_role   text;
  v_member_role_id int;
  v_user_role_id   int;
  v_has_active     boolean := false;
begin
  if p_user_id is null then
    return;
  end if;

  select id into v_member_role_id from roles where name = 'member';
  select id into v_user_role_id   from roles where name = 'user';

  select r.name
    into v_current_role
  from user_roles ur
  join roles r on r.id = ur.role_id
  where ur.user_id = p_user_id;

  -- roles assigned by a super admin are never changed here
  if v_current_role is not null and v_current_role not in ('user', 'member') then
    return;
  end if;

  -- ACTIVE if:
  --   * household covers today for primary/member email
  --   * OR member_eligibility has active=true for the email
  select exists (
    select 1
    from membership_households mh
    left join membership_members mm on mm.household_id = mh.id
    where lower(coalesce(mm.email, mh.primary_email)) = lower(p_email)
      and (
        (mh.start_date is not null and mh.end_date is not null
         and current_date between mh.start_date and mh.end_date)
        or (mh.start_date is null or mh.end_date is null)
      )
  )
  or exists (
    select 1
    from member_eligibility me
    where lower(me.email) = lower(p_email)
      and coalesce(me.active, true)
  )
  into v_has_active;

  insert into user_roles(user_id, role_id)
  values (p_user_id, case when v_has_active then v_member_role_id else v_user_role_id end)
  on conflict (user_id) do update
    set role_id = excluded.role_id
    where (select name from roles r2 where r2.id = user_roles.role_id) in ('user', 'member');
end;
$$;

-- refresh_my_role (called from the browser after login) only touches the
-- caller's own row, so it may run as owner to reach sync_member_role.
ALTER FUNCTION public.refresh_my_role() SECURITY DEFINER SET search_path = public;

-- Profile-insert trigger ran as the signing-up user; the user_roles INSERT
-- policy now only allows the 'user' role, so run it as owner.
ALTER FUNCTION public.grant_member_role_if_eligible() SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 2) Role checks read only the caller's own user_roles row, which RLS already
--    allows, so they don't need owner privileges.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.is_admin()                  SECURITY INVOKER;
ALTER FUNCTION public.is_admin(uuid)              SECURITY INVOKER;
ALTER FUNCTION public.is_volunteer(uuid)          SECURITY INVOKER;
ALTER FUNCTION public.has_any_role(text[])        SECURITY INVOKER;

-- ---------------------------------------------------------------------------
-- 3) Fixed search_path on the remaining functions (function_search_path_mutable)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public._bump_updated_at()                         SET search_path = public;
ALTER FUNCTION public.set_updated_at()                           SET search_path = public;
ALTER FUNCTION public.update_updated_at_column()                 SET search_path = public;
ALTER FUNCTION public.has_role(uuid, text[])                     SET search_path = public;
ALTER FUNCTION public.grant_role_by_name_once(uuid, text)        SET search_path = public;
ALTER FUNCTION public.replace_role_with_member(uuid)             SET search_path = public;
ALTER FUNCTION public.replace_role_with_user(uuid)               SET search_path = public;
ALTER FUNCTION public.upsert_membership(uuid, text, text, integer, text, text, text)
  SET search_path = public;
ALTER FUNCTION public.upsert_membership(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz)
  SET search_path = public;

-- ---------------------------------------------------------------------------
-- 4) Execute rights. Functions are executable by PUBLIC by default.
--    Triggers fire regardless of EXECUTE rights, so trigger functions and
--    server-only helpers are closed to API callers entirely.
-- ---------------------------------------------------------------------------
DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_auth_user_insert', 'handle_household_change', 'handle_membership_member_change',
        'grant_member_role_if_eligible', '_bump_updated_at', 'set_updated_at', 'update_updated_at_column',
        'sync_member_role', 'grant_role_by_name_once', 'replace_role_with_member', 'replace_role_with_user',
        'upsert_membership'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- Signed-in only (each checks is_super_admin() / auth.uid() itself)
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refresh_my_role() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.list_users_with_roles(text, text, integer, integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.refresh_my_role() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) membership_households: owners could update any column of their own
--    household (end_date, status, subscription fields). The only client-side
--    write is /api/membership/revoke, which now uses the service role after
--    checking ownership.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "household update by owner or email" ON public.membership_households;
DROP POLICY IF EXISTS "owner update own household"         ON public.membership_households;

-- ---------------------------------------------------------------------------
-- 6) social_service_requests: volunteers may assign themselves, unassign,
--    mark in_review/completed and edit notes. Approve/decline/archive and
--    every other column stay with admins (matches /admin/social-services).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_social_service_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  editable text[] := ARRAY['status', 'assigned_to', 'admin_notes', 'updated_at'];
BEGIN
  IF current_user NOT IN ('anon', 'authenticated')
     OR public.has_any_role(ARRAY['admin', 'super_admin']) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('in_review', 'completed') THEN
    RAISE EXCEPTION 'Only admins can set status to %', NEW.status USING ERRCODE = '42501';
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> auth.uid() THEN
    RAISE EXCEPTION 'Volunteers can only assign requests to themselves' USING ERRCODE = '42501';
  END IF;

  IF (to_jsonb(NEW) - editable) IS DISTINCT FROM (to_jsonb(OLD) - editable) THEN
    RAISE EXCEPTION 'Volunteers can only change status, assignment and notes' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_social_service_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_social_service_update ON public.social_service_requests;
CREATE TRIGGER guard_social_service_update
  BEFORE UPDATE ON public.social_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_social_service_update();
