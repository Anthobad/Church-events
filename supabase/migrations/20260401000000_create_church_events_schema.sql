-- ==============================================================================
-- CHURCH EVENTS & SEATING RESERVATION DATABASE MIGRATION
-- Built for Supabase GitHub Integration & Automated Database Deployment
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Church Events Table
CREATE TABLE IF NOT EXISTS public.church_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'registration_required', -- 'open' or 'registration_required'
  is_paid BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  blueprint JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Registrations Table
CREATE TABLE IF NOT EXISTS public.church_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.church_events(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  element_id TEXT,
  element_label TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  code_used TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Admin 8-Digit Reservation Codes Table
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

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_church_events_date ON public.church_events(date);
CREATE INDEX IF NOT EXISTS idx_church_events_created_at ON public.church_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_church_registrations_event_id ON public.church_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_church_admin_codes_event_id ON public.church_admin_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_church_admin_codes_code ON public.church_admin_codes(code);

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.church_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_admin_codes ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public select events" ON public.church_events;
  DROP POLICY IF EXISTS "Public insert events" ON public.church_events;
  DROP POLICY IF EXISTS "Public update events" ON public.church_events;
  DROP POLICY IF EXISTS "Public delete events" ON public.church_events;
  
  DROP POLICY IF EXISTS "Public select registrations" ON public.church_registrations;
  DROP POLICY IF EXISTS "Public insert registrations" ON public.church_registrations;
  DROP POLICY IF EXISTS "Public update registrations" ON public.church_registrations;
  DROP POLICY IF EXISTS "Public delete registrations" ON public.church_registrations;

  DROP POLICY IF EXISTS "Public select admin codes" ON public.church_admin_codes;
  DROP POLICY IF EXISTS "Public insert admin codes" ON public.church_admin_codes;
  DROP POLICY IF EXISTS "Public update admin codes" ON public.church_admin_codes;
  DROP POLICY IF EXISTS "Public delete admin codes" ON public.church_admin_codes;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Policies for church_events
CREATE POLICY "Public select events" ON public.church_events FOR SELECT USING (true);
CREATE POLICY "Public insert events" ON public.church_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update events" ON public.church_events FOR UPDATE USING (true);
CREATE POLICY "Public delete events" ON public.church_events FOR DELETE USING (true);

-- Policies for church_registrations
CREATE POLICY "Public select registrations" ON public.church_registrations FOR SELECT USING (true);
CREATE POLICY "Public insert registrations" ON public.church_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update registrations" ON public.church_registrations FOR UPDATE USING (true);
CREATE POLICY "Public delete registrations" ON public.church_registrations FOR DELETE USING (true);

-- Policies for church_admin_codes
CREATE POLICY "Public select admin codes" ON public.church_admin_codes FOR SELECT USING (true);
CREATE POLICY "Public insert admin codes" ON public.church_admin_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update admin codes" ON public.church_admin_codes FOR UPDATE USING (true);
CREATE POLICY "Public delete admin codes" ON public.church_admin_codes FOR DELETE USING (true);

-- 7. Supabase Storage: Event Images Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Storage policies for event-images bucket
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public view event images" ON storage.objects;
  DROP POLICY IF EXISTS "Public upload event images" ON storage.objects;
  DROP POLICY IF EXISTS "Public update event images" ON storage.objects;
  DROP POLICY IF EXISTS "Public delete event images" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Public view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Public upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Public update event images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-images');

CREATE POLICY "Public delete event images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-images');

-- 8. Enable Realtime Publications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'church_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.church_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'church_registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.church_registrations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'church_admin_codes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.church_admin_codes;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
