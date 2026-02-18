-- Create ramadan_volunteers table
CREATE TABLE IF NOT EXISTS public.ramadan_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_team TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ramadan_volunteers_created_at ON public.ramadan_volunteers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ramadan_volunteers_status ON public.ramadan_volunteers(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.ramadan_volunteers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins, super-admins, and volunteers to read
CREATE POLICY "Allow read for admin, super-admin, and volunteer roles"
  ON public.ramadan_volunteers
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin', 'volunteer')
  );

-- Policy: Allow admins and super-admins to update
CREATE POLICY "Allow update for admin and super-admin"
  ON public.ramadan_volunteers
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'super-admin')
  );

-- Policy: Allow public to insert (for form submission)
CREATE POLICY "Allow insert for anyone"
  ON public.ramadan_volunteers
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.ramadan_volunteers IS 'Stores Ramadan volunteer signups from the website';
