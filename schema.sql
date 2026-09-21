-- ==============================================================================
-- CHURCH EVENTS DATABASE SCHEMA FOR SUPABASE
-- Instructions:
-- 1. Open your Supabase project dashboard (https://supabase.com/dashboard)
-- 2. Click on "SQL Editor" in the left sidebar menu
-- 3. Click "New query", paste the entire code below, and click "Run"
-- ==============================================================================

-- 1. Create the Church Events Table
CREATE TABLE IF NOT EXISTS public.church_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'registration_required', -- 'open' or 'registration_required'
  is_paid BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  blueprint JSONB, -- Stores interactive seating map (chairs, tables, labels)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create the Registrations Table
CREATE TABLE IF NOT EXISTS public.church_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.church_events(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  element_id TEXT, -- ID of the chair or table from blueprint
  element_label TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  code_used TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create the Admin Reservation 8-Digit Codes Table
CREATE TABLE IF NOT EXISTS public.church_admin_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES public.church_events(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  claimed BOOLEAN NOT NULL DEFAULT false,
  element_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Set up Row Level Security (RLS) policies for public church access
ALTER TABLE public.church_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_admin_codes ENABLE ROW LEVEL SECURITY;

-- Allow public viewing and admin event updates
CREATE POLICY "Public read events" ON public.church_events FOR SELECT USING (true);
CREATE POLICY "Public write events" ON public.church_events FOR ALL USING (true);

-- Allow public registration submissions and viewing
CREATE POLICY "Public read registrations" ON public.church_registrations FOR SELECT USING (true);
CREATE POLICY "Public insert registrations" ON public.church_registrations FOR INSERT WITH CHECK (true);

-- Allow admin codes verification and creation
CREATE POLICY "Public read admin codes" ON public.church_admin_codes FOR SELECT USING (true);
CREATE POLICY "Public write admin codes" ON public.church_admin_codes FOR ALL USING (true);

-- 5. Enable Supabase Realtime so changes update live across screens
ALTER PUBLICATION supabase_realtime ADD TABLE public.church_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.church_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.church_admin_codes;
