-- Nikah (marriage) service requests, replacing the Google Form.
-- The public form at /services/nikah-matrimony posts to /api/nikah (service role);
-- admins and super admins manage them at /admin/nikah via /api/admin/nikah.
-- RLS is on with no policies so the table is closed to anon/authenticated callers.

CREATE TABLE IF NOT EXISTS public.nikah_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  submitted_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Contact and ceremony details
  contact_email       text NOT NULL,
  groom_name          text NOT NULL,
  groom_phone         text NOT NULL,
  groom_email         text,
  groom_address       text,
  bride_name          text NOT NULL,
  bride_phone         text NOT NULL,
  bride_email         text,
  nikah_date          date NOT NULL,
  nikah_time          time NOT NULL,
  location            text NOT NULL DEFAULT 'ICFC',
  location_address    text,

  -- Islamic marriage requirements
  requirements        jsonb NOT NULL,          -- { consent|wali|witnesses|mahr|license|kafaah|impediments: available|not_available }
  requirements_notes  text,
  vows_acknowledged   boolean NOT NULL,
  witnesses           text NOT NULL,
  mahr                text NOT NULL,
  wali                text NOT NULL,
  wali_details        text,
  kafaah              text NOT NULL,
  impediments         text NOT NULL,
  license             text NOT NULL,

  -- Declaration, resources, donation
  declaration_groom   boolean NOT NULL DEFAULT false,
  declaration_bride   boolean NOT NULL DEFAULT false,
  resources_checked   boolean NOT NULL DEFAULT false,
  resources_note      text,
  wants_to_donate     boolean NOT NULL DEFAULT false,
  donation_amount     text,

  -- Staff workflow
  status              text NOT NULL DEFAULT 'new',
  scheduled_date      date,
  scheduled_time      time,
  officiant           text,
  staff_notes         text,

  submitter_ip        text,
  user_agent          text,

  CONSTRAINT nikah_witnesses_chk   CHECK (witnesses   IN ('confirmed','will_arrange','need_help')),
  CONSTRAINT nikah_mahr_chk        CHECK (mahr        IN ('agreed','not_yet','discussing','not_agreed')),
  CONSTRAINT nikah_wali_chk        CHECK (wali        IN ('father','relative','imam')),
  CONSTRAINT nikah_kafaah_chk      CHECK (kafaah      IN ('both_muslim','kitabiyya','not_met')),
  CONSTRAINT nikah_impediments_chk CHECK (impediments IN ('none','some','unclear')),
  CONSTRAINT nikah_license_chk     CHECK (license     IN ('have','will_obtain','need_info')),
  CONSTRAINT nikah_status_chk      CHECK (status IN ('new','in_review','scheduled','completed','declined','cancelled'))
);

CREATE INDEX IF NOT EXISTS nikah_requests_status_idx ON public.nikah_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS nikah_requests_date_idx   ON public.nikah_requests (nikah_date);
CREATE INDEX IF NOT EXISTS nikah_requests_ip_idx     ON public.nikah_requests (submitter_ip, created_at DESC);

DROP TRIGGER IF EXISTS nikah_requests_updated_at ON public.nikah_requests;
CREATE TRIGGER nikah_requests_updated_at
  BEFORE UPDATE ON public.nikah_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.nikah_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nikah_requests FROM anon, authenticated;
GRANT ALL ON public.nikah_requests TO service_role;
