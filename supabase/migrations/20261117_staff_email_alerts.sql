-- Staff email alerts: when a new request arrives (contact message, social
-- services, support network, nikah, Ramadan volunteer, Zelle/bank donation),
-- everyone whose role can open that dashboard is emailed, unless they muted
-- that alert in My Profile. Sending happens in src/lib/staff-alerts.ts.

CREATE TABLE IF NOT EXISTS public.staff_alert_prefs (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_alerts  text[] NOT NULL DEFAULT '{}',   -- alert keys this person turned off
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS staff_alert_prefs_updated_at ON public.staff_alert_prefs;
CREATE TRIGGER staff_alert_prefs_updated_at
  BEFORE UPDATE ON public.staff_alert_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.staff_alert_prefs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_alert_prefs FROM anon, authenticated;
GRANT ALL ON public.staff_alert_prefs TO service_role;

-- Login emails of users holding one of p_roles who have not muted p_alert.
-- Reads auth.users, so it is service-role only.
CREATE OR REPLACE FUNCTION public.staff_alert_recipients(p_roles text[], p_alert text)
RETURNS TABLE (email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT DISTINCT lower(u.email)::text, r.name::text
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN auth.users u   ON u.id = ur.user_id
  LEFT JOIN public.staff_alert_prefs p ON p.user_id = ur.user_id
  WHERE r.name = ANY (p_roles)
    AND u.email IS NOT NULL
    AND u.deleted_at IS NULL
    AND NOT (p_alert = ANY (coalesce(p.muted_alerts, '{}')));
$$;

REVOKE ALL ON FUNCTION public.staff_alert_recipients(text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_alert_recipients(text[], text) TO service_role;
