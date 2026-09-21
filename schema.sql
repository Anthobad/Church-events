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

-- 6. Storage Bucket for Event Images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-images', 'event-images', true, 5242880)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public event images storage" ON storage.objects FOR ALL USING (bucket_id = 'event-images') WITH CHECK (bucket_id = 'event-images');

-- 7. Provision 1 Admin Account in Supabase Auth
-- Username: admin (or admin@church.org)
-- Password: churchAdmin2026!
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  admin_uid UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@church.org') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@church.org',
      crypt('churchAdmin2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"admin","role":"admin"}',
      NOW(),
      NOW()
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      admin_uid,
      admin_uid,
      json_build_object('sub', admin_uid::text, 'email', 'admin@church.org')::jsonb,
      'email',
      admin_uid::text,
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('churchAdmin2026!', gen_salt('bf')),
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email = 'admin@church.org';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'church.admin@gmail.com') THEN
    UPDATE auth.users
    SET encrypted_password = crypt('churchAdmin2026!', gen_salt('bf')),
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email = 'church.admin@gmail.com';
  END IF;
END $$;
