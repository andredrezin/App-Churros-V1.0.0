
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('caixa','producao','admin');
CREATE TYPE public.opcao_tipo AS ENUM ('recheio','cobertura','tamanho');
CREATE TYPE public.pedido_status AS ENUM ('aguardando','em_preparo','pronto','entregue','cancelado');
CREATE TYPE public.metodo_pagamento AS ENUM ('dinheiro','pix','cartao');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid() ORDER BY 
  CASE role WHEN 'admin' THEN 1 WHEN 'producao' THEN 2 WHEN 'caixa' THEN 3 END LIMIT 1 $$;

-- CATEGORIAS
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- PRODUTOS
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  permite_recheio BOOLEAN NOT NULL DEFAULT false,
  permite_cobertura BOOLEAN NOT NULL DEFAULT false,
  permite_tamanho BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- OPCOES PRODUTO (recheios/coberturas/tamanhos globais para a categoria churros, mas por simplicidade ligamos ao produto pai null = global por tipo)
CREATE TABLE public.opcoes_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo opcao_tipo NOT NULL,
  nome TEXT NOT NULL,
  preco_adicional NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.opcoes_produto ENABLE ROW LEVEL SECURITY;

-- SEQUENCIA DIARIA
CREATE TABLE public.pedido_sequencia (
  data DATE PRIMARY KEY,
  ultimo_numero INT NOT NULL DEFAULT 0
);
ALTER TABLE public.pedido_sequencia ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.proximo_numero_pedido()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT; hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  INSERT INTO public.pedido_sequencia(data, ultimo_numero) VALUES (hoje, 1)
  ON CONFLICT (data) DO UPDATE SET ultimo_numero = pedido_sequencia.ultimo_numero + 1
  RETURNING ultimo_numero INTO n;
  RETURN n;
END $$;

-- PEDIDOS
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_dia INT NOT NULL,
  data_pedido DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  status pedido_status NOT NULL DEFAULT 'aguardando',
  metodo_pagamento metodo_pagamento NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ
);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_data ON public.pedidos(data_pedido);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- ITENS PEDIDO
CREATE TABLE public.itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  -- snapshot de opções escolhidas em texto (para exibição rápida) + relação
  opcoes_texto TEXT
);
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- ITENS OPCOES
CREATE TABLE public.itens_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_pedido_id UUID NOT NULL REFERENCES public.itens_pedido(id) ON DELETE CASCADE,
  opcao_id UUID NOT NULL REFERENCES public.opcoes_produto(id),
  preco_adicional NUMERIC(10,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.itens_opcoes ENABLE ROW LEVEL SECURITY;

-- TRIGGER: novo usuário cria profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- profiles: usuário vê próprio perfil; admin vê todos
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles: usuário lê próprio role; admin gerencia tudo
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- categorias/produtos/opcoes: leitura para todos autenticados, escrita só admin
CREATE POLICY "cat read" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat admin" ON public.categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "prod read" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod admin" ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "opc read" ON public.opcoes_produto FOR SELECT TO authenticated USING (true);
CREATE POLICY "opc admin" ON public.opcoes_produto FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- pedido_sequencia: ninguém escreve direto (só pela função). Leitura para autenticados.
CREATE POLICY "seq read" ON public.pedido_sequencia FOR SELECT TO authenticated USING (true);

-- pedidos: caixa+admin criam; caixa/producao/admin lêem; producao+admin atualizam status; admin deleta
CREATE POLICY "pedidos read" ON public.pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pedidos insert caixa" ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'caixa') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pedidos update prod" ON public.pedidos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'caixa'));
CREATE POLICY "pedidos delete admin" ON public.pedidos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "itens read" ON public.itens_pedido FOR SELECT TO authenticated USING (true);
CREATE POLICY "itens write" ON public.itens_pedido FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'caixa') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'caixa') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "itens_opc read" ON public.itens_opcoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "itens_opc write" ON public.itens_opcoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'caixa') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'caixa') OR public.has_role(auth.uid(),'admin'));

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_pedido;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.itens_pedido REPLICA IDENTITY FULL;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.proximo_numero_pedido() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.proximo_numero_pedido() TO authenticated;
-- ============================================================
-- SEED: Cardápio real — Churros Crocantes
-- Execute uma vez após as migrations de estrutura
-- ============================================================

-- CATEGORIAS
INSERT INTO public.categorias (id, nome, ordem, ativo) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Churros',  1, true),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'Kreps',    2, true),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'Bebidas',  3, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CHURROS
-- ============================================================
INSERT INTO public.produtos (id, categoria_id, nome, descricao, preco_base, ativo, permite_recheio, permite_cobertura, permite_tamanho) VALUES
  ('bbbbbbbb-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001',
   'Churro Simples', '1 unidade recheada à sua escolha', 8.00, true, true, true, false),
  ('bbbbbbbb-0002-0002-0002-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001',
   'Combo 3 Churros', '3 unidades recheadas', 22.00, true, true, true, false),
  ('bbbbbbbb-0003-0003-0003-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001',
   'Combo 5 Churros', '5 unidades recheadas', 35.00, true, true, true, false)
ON CONFLICT (id) DO NOTHING;

-- RECHEIOS (ligados ao produto pai null = globais para churros — produto_id null)
INSERT INTO public.opcoes_produto (id, produto_id, tipo, nome, preco_adicional, ativo) VALUES
  ('cccccccc-r001-r001-r001-000000000001', null, 'recheio', 'Doce de Leite',  0.00, true),
  ('cccccccc-r002-r002-r002-000000000002', null, 'recheio', 'Brigadeiro',     0.00, true),
  ('cccccccc-r003-r003-r003-000000000003', null, 'recheio', 'Nutella',        2.00, true),
  ('cccccccc-r004-r004-r004-000000000004', null, 'recheio', 'Goiabada',       0.00, true)
ON CONFLICT (id) DO NOTHING;

-- COBERTURAS
INSERT INTO public.opcoes_produto (id, produto_id, tipo, nome, preco_adicional, ativo) VALUES
  ('cccccccc-c001-c001-c001-000000000001', null, 'cobertura', 'Amendoim',             0.00, true),
  ('cccccccc-c002-c002-c002-000000000002', null, 'cobertura', 'Castanha de Caju',     0.00, true),
  ('cccccccc-c003-c003-c003-000000000003', null, 'cobertura', 'Coco em Floco',        0.00, true),
  ('cccccccc-c004-c004-c004-000000000004', null, 'cobertura', 'Chocolate Granulado',  0.00, true),
  ('cccccccc-c005-c005-c005-000000000005', null, 'cobertura', 'Granulado Colorido',   0.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- KREPS
-- ============================================================
INSERT INTO public.produtos (id, categoria_id, nome, descricao, preco_base, ativo, permite_recheio, permite_cobertura, permite_tamanho) VALUES
  -- Doces
  ('bbbbbbbb-k001-k001-k001-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Nutella',                    'Crepe doce com Nutella', 15.00, true, false, false, false),
  ('bbbbbbbb-k002-k002-k002-000000000002', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Doce de Leite + Banana',     'Crepe com doce de leite e banana', 15.00, true, false, false, false),
  ('bbbbbbbb-k003-k003-k003-000000000003', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Brigadeiro',                 'Crepe doce com brigadeiro', 15.00, true, false, false, false),
  ('bbbbbbbb-k004-k004-k004-000000000004', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Morango com Chantilly',      'Crepe doce com morango e chantilly', 16.00, true, false, false, false),
  -- Salgados
  ('bbbbbbbb-k005-k005-k005-000000000005', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Frango com Catupiry',        'Crepe salgado com frango e catupiry', 18.00, true, false, false, false),
  ('bbbbbbbb-k006-k006-k006-000000000006', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Presunto e Queijo',          'Crepe salgado com presunto e queijo', 17.00, true, false, false, false),
  ('bbbbbbbb-k007-k007-k007-000000000007', 'aaaaaaaa-0002-0002-0002-000000000002',
   'Krep Atum com Cream Cheese',      'Crepe salgado com atum e cream cheese', 18.00, true, false, false, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BEBIDAS
-- ============================================================
INSERT INTO public.produtos (id, categoria_id, nome, descricao, preco_base, ativo, permite_recheio, permite_cobertura, permite_tamanho) VALUES
  ('bbbbbbbb-b001-b001-b001-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003',
   'Água', null, 3.00, true, false, false, false),
  ('bbbbbbbb-b002-b002-b002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003',
   'Refrigerante Lata', 'Coca, Guaraná ou Sprite', 5.00, true, false, false, false),
  ('bbbbbbbb-b003-b003-b003-000000000003', 'aaaaaaaa-0003-0003-0003-000000000003',
   'Suco em Caixinha', null, 4.00, true, false, false, false)
ON CONFLICT (id) DO NOTHING;
