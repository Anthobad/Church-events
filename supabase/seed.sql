-- ==============================================================================
-- CHURCH EVENTS DATABASE SEED DATA
-- Executed automatically by Supabase on database initialization or reset
-- ==============================================================================

-- 1. Insert Initial Events
INSERT INTO public.church_events (id, title, description, image_url, date, time, location, type, is_paid, views, likes, blueprint, created_at)
VALUES 
(
  'event-1',
  'عشاء المحبة السنوي ورسالة القيامة | Annual Parish Agape Dinner',
  'ندعو جميع العائلات وأبناء الرعية للمشاركة في عشاء المحبة الأخوي المبارك. يتضمن الحفل كلمة راعي الكنيسة، عروض كورال الأطفال، وتكريم المتطوعين. يرجى التنسيق مع الإدارة لتأكيد الحجز.',
  'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80',
  '2026-04-18',
  '19:30',
  'قاعة القديس بولس الكبرى - مجمع الكنيسة',
  'registration_required',
  true,
  142,
  38,
  '{
    "width": 720,
    "height": 480,
    "perimeterPoints": [
      { "x": 8, "y": 8 },
      { "x": 712, "y": 8 },
      { "x": 712, "y": 472 },
      { "x": 8, "y": 472 }
    ],
    "elements": [
      { "id": "t-1", "type": "table_round", "x": 120, "y": 110, "width": 80, "height": 80, "label": "طاولة 1 (VIP)", "capacity": 4 },
      { "id": "t-2", "type": "table_round", "x": 270, "y": 110, "width": 80, "height": 80, "label": "طاولة 2", "capacity": 4 },
      { "id": "t-3", "type": "table_round", "x": 420, "y": 110, "width": 80, "height": 80, "label": "طاولة 3", "capacity": 4 },
      { "id": "t-4", "type": "table_round", "x": 560, "y": 110, "width": 80, "height": 80, "label": "طاولة 4", "capacity": 4 },
      { "id": "t-5", "type": "table_rect", "x": 150, "y": 250, "width": 140, "height": 80, "label": "طاولة العائلات A", "capacity": 6 },
      { "id": "t-6", "type": "table_rect", "x": 380, "y": 250, "width": 140, "height": 80, "label": "طاولة العائلات B", "capacity": 6 },
      { "id": "t-7", "type": "table_round", "x": 200, "y": 380, "width": 90, "height": 90, "label": "طاولة الرعاة", "capacity": 8 },
      { "id": "t-8", "type": "table_round", "x": 440, "y": 380, "width": 90, "height": 90, "label": "طاولة الشباب", "capacity": 8 },
      { "id": "lbl-stage", "type": "label", "x": 350, "y": 40, "width": 160, "height": 30, "label": "منصة التكريم والكورال (Stage)", "capacity": 0 }
    ]
  }'::jsonb,
  NOW() - INTERVAL '3 days'
),
(
  'event-2',
  'أمسية ترانيم جوقة الرجاء الروحية | Choir Recital of Hope',
  'أمسية صلاة وتأمل تحييها جوقة شبيبة الكنيسة مع تراتيل شرقية وغربية وألحان كنسية تراثية. الدخول مجاني مع ضرورة حجز المقاعد مسبقاً لضمان الأماكن.',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
  '2026-04-24',
  '18:00',
  'كنيسة البشارة - الصحن الرئيسي',
  'registration_required',
  false,
  215,
  64,
  '{
    "width": 720,
    "height": 480,
    "perimeterPoints": [
      { "x": 8, "y": 8 },
      { "x": 712, "y": 8 },
      { "x": 712, "y": 472 },
      { "x": 8, "y": 472 }
    ],
    "elements": [
      { "id": "c-a1", "type": "chair", "x": 100, "y": 130, "width": 44, "height": 44, "label": "A1", "capacity": 1 },
      { "id": "c-a2", "type": "chair", "x": 160, "y": 130, "width": 44, "height": 44, "label": "A2", "capacity": 1 },
      { "id": "c-a3", "type": "chair", "x": 220, "y": 130, "width": 44, "height": 44, "label": "A3", "capacity": 1 },
      { "id": "c-a4", "type": "chair", "x": 280, "y": 130, "width": 44, "height": 44, "label": "A4", "capacity": 1 },
      { "id": "c-a5", "type": "chair", "x": 360, "y": 130, "width": 44, "height": 44, "label": "A5", "capacity": 1 },
      { "id": "c-a6", "type": "chair", "x": 420, "y": 130, "width": 44, "height": 44, "label": "A6", "capacity": 1 },
      { "id": "c-a7", "type": "chair", "x": 480, "y": 130, "width": 44, "height": 44, "label": "A7", "capacity": 1 },
      { "id": "c-a8", "type": "chair", "x": 540, "y": 130, "width": 44, "height": 44, "label": "A8", "capacity": 1 },
      { "id": "c-b1", "type": "chair", "x": 100, "y": 200, "width": 44, "height": 44, "label": "B1", "capacity": 1 },
      { "id": "c-b2", "type": "chair", "x": 160, "y": 200, "width": 44, "height": 44, "label": "B2", "capacity": 1 },
      { "id": "c-b3", "type": "chair", "x": 220, "y": 200, "width": 44, "height": 44, "label": "B3", "capacity": 1 },
      { "id": "c-b4", "type": "chair", "x": 280, "y": 200, "width": 44, "height": 44, "label": "B4", "capacity": 1 },
      { "id": "c-b5", "type": "chair", "x": 360, "y": 200, "width": 44, "height": 44, "label": "B5", "capacity": 1 },
      { "id": "c-b6", "type": "chair", "x": 420, "y": 200, "width": 44, "height": 44, "label": "B6", "capacity": 1 },
      { "id": "c-b7", "type": "chair", "x": 480, "y": 200, "width": 44, "height": 44, "label": "B7", "capacity": 1 },
      { "id": "c-b8", "type": "chair", "x": 540, "y": 200, "width": 44, "height": 44, "label": "B8", "capacity": 1 },
      { "id": "lbl-altar", "type": "label", "x": 320, "y": 50, "width": 220, "height": 32, "label": "مذبح الكنيسة ومنصة المرنمين", "capacity": 0 }
    ]
  }'::jsonb,
  NOW() - INTERVAL '2 days'
),
(
  'event-3',
  'القداس الإلهي الاحتفالي ولقاء شبيبة الرعية | Sunday Solemn Mass & Youth Gathering',
  'قداس الأحد مع رتبة تبريك العائلات وأنشطة روحية واجتماعية لأطفال وشباب التعليم المسيحي في حديقة الكنيسة. الدخول عام ومفتوح للجميع دون الحاجة لتسجيل مسبق.',
  'https://images.unsplash.com/photo-1548625361-16eb1642841b?auto=format&fit=crop&w=800&q=80',
  '2026-05-03',
  '10:30',
  'كاتدرائية القيامة - الصحن الكبير',
  'open',
  false,
  98,
  45,
  NULL,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Initial Admin Reservation Codes
INSERT INTO public.church_admin_codes (id, code, event_id, user_name, party_size, claimed, element_id, created_at)
VALUES
  ('code-1', '84920173', 'event-1', 'عائلة الخوري الياس', 4, true, 't-1', NOW() - INTERVAL '6 hours'),
  ('code-2', '55129481', 'event-1', 'عائلة نجار', 3, true, 't-5', NOW() - INTERVAL '4 hours'),
  ('code-3', '19472658', 'event-1', 'طوني حداد (مدفوع)', 2, false, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Initial Registrations
INSERT INTO public.church_registrations (id, event_id, user_name, user_phone, party_size, element_id, element_label, is_paid, code_used, registered_at)
VALUES
  ('reg-1', 'event-1', 'عائلة الخوري الياس', '+961 70 123 456', 4, 't-1', 'طاولة 1 (VIP)', true, '84920173', NOW() - INTERVAL '6 hours'),
  ('reg-2', 'event-1', 'عائلة نجار', '+961 03 987 654', 3, 't-5', 'طاولة العائلات A', true, '55129481', NOW() - INTERVAL '4 hours'),
  ('reg-3', 'event-2', 'مريم إبراهيم', '+961 71 555 444', 1, 'c-a1', 'A1', false, NULL, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 4. Provision 1 Admin User in auth.users
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
