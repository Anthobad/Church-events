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

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read events" ON public.church_events;
  DROP POLICY IF EXISTS "Public write events" ON public.church_events;
  DROP POLICY IF EXISTS "Public read registrations" ON public.church_registrations;
  DROP POLICY IF EXISTS "Public insert registrations" ON public.church_registrations;
  DROP POLICY IF EXISTS "Public read admin codes" ON public.church_admin_codes;
  DROP POLICY IF EXISTS "Public write admin codes" ON public.church_admin_codes;
  DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Public event images storage" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'church_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.church_events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'church_registrations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.church_registrations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'church_admin_codes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.church_admin_codes;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. Storage Bucket for Event Images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-images', 'event-images', true, 5242880)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public event images storage" ON storage.objects FOR ALL USING (bucket_id = 'event-images') WITH CHECK (bucket_id = 'event-images');

-- 7. User Profiles Table (Stores usernames for Supabase accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to automatically create or sync user profile when admin is created in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      username = COALESCE(profiles.username, EXCLUDED.username),
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime for profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
