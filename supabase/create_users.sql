-- Criar os 3 usuários do sistema Churros Crocantes
DO $$
DECLARE
  uid_caixa    UUID;
  uid_producao UUID;
  uid_admin    UUID;
BEGIN

  -- CAIXA
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'caixa@churros.app') THEN
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      gen_random_uuid(), 'caixa@churros.app',
      crypt('Caixa@2025!', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{"nome":"Caixa"}', false
    );
  END IF;
  SELECT id INTO uid_caixa FROM auth.users WHERE email = 'caixa@churros.app';

  -- PRODUÇÃO
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'producao@churros.app') THEN
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      gen_random_uuid(), 'producao@churros.app',
      crypt('Prod@2025!', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{"nome":"Producao"}', false
    );
  END IF;
  SELECT id INTO uid_producao FROM auth.users WHERE email = 'producao@churros.app';

  -- ADMIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@churros.app') THEN
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      gen_random_uuid(), 'admin@churros.app',
      crypt('Admin@2025!', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{"nome":"Admin"}', false
    );
  END IF;
  SELECT id INTO uid_admin FROM auth.users WHERE email = 'admin@churros.app';

  -- Atribuir roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (uid_caixa,    'caixa'),
    (uid_producao, 'producao'),
    (uid_admin,    'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;
