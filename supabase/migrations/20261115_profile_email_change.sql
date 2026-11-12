-- When a user confirms a new login email, carry their membership with them.
--
-- Memberships are matched to people by email (sync_member_role, the members
-- directory, /membership/manage). Without this, changing the login email would
-- leave the membership on the old address and the user would drop to 'user'.
--
-- Fires on auth.users after Supabase applies a confirmed email change.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_auth_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_old text := lower(btrim(old.email));
  v_new text := lower(btrim(new.email));
begin
  if v_old is null or v_new is null or v_old = v_new then
    return new;
  end if;

  update profiles set email = new.email where id = new.id;

  -- Households this user is the primary contact for (never one that is linked
  -- to a different account)
  update membership_households
     set primary_email = new.email,
         user_id = coalesce(user_id, new.id)
   where lower(btrim(primary_email)) = v_old
     and (user_id is null or user_id = new.id);

  -- Member rows with the old address. Login emails are unique, so the old
  -- address was this user's; family rows that shared it move with them.
  update membership_members
     set email = new.email
   where lower(btrim(email)) = v_old;

  update member_eligibility set email = new.email where lower(btrim(email)) = v_old;

  perform sync_member_role(new.id, new.email);
  return new;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_auth_email_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auth_user_email_change ON auth.users;
CREATE TRIGGER trg_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_email_change();

COMMIT;
