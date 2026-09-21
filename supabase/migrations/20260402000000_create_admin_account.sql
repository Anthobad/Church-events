-- ==============================================================================
-- 1 ADMIN ACCOUNT FOR CHURCH EVENTS MANAGEMENT
-- ==============================================================================
-- This script provisions the 1 dedicated church administrator account in Supabase.
-- Public user signup is disabled; only this administrator account has access.
--
-- Credentials:
--   Username: admin (or admin@church.org)
--   Password: churchAdmin2026!
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  admin_uid UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  -- 1. If admin user doesn't exist, insert into auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@church.org') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
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

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
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
    -- If already exists, ensure email is confirmed and password set
    UPDATE auth.users
    SET encrypted_password = crypt('churchAdmin2026!', gen_salt('bf')),
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email = 'admin@church.org';
  END IF;

  -- Also confirm church.admin@gmail.com with the same password if present
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'church.admin@gmail.com') THEN
    UPDATE auth.users
    SET encrypted_password = crypt('churchAdmin2026!', gen_salt('bf')),
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email = 'church.admin@gmail.com';
  END IF;
END $$;
