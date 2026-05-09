-- ============================================================
-- SEED: Cardápio real — Churros Crocantes
-- ============================================================

-- CATEGORIAS
INSERT INTO public.categorias (id, nome, ordem, ativo) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Churros',  1, true),
  ('a0000002-0000-0000-0000-000000000002', 'Kreps',    2, true),
  ('a0000003-0000-0000-0000-000000000003', 'Bebidas',  3, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CHURROS
-- ============================================================
INSERT INTO public.produtos (id, categoria_id, nome, descricao, preco_base, ativo, permite_recheio, permite_cobertura, permite_tamanho) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   'Churro Simples',  '1 unidade recheada à sua escolha', 8.00,  true, true, true, false),
  ('b0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   'Combo 3 Churros', '3 unidades recheadas',             22.00, true, true, true, false),
  ('b0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001',
   'Combo 5 Churros', '5 unidades recheadas',             35.00, true, true, true, false)
ON CONFLICT (id) DO NOTHING;

-- RECHEIOS (produto_id null = disponíveis para todos os churros)
INSERT INTO public.opcoes_produto (id, produto_id, tipo, nome, preco_adicional, ativo) VALUES
  ('c0000001-0000-0000-0000-000000000001', null, 'recheio', 'Doce de Leite', 0.00, true),
  ('c0000002-0000-0000-0000-000000000002', null, 'recheio', 'Brigadeiro',    0.00, true),
  ('c0000003-0000-0000-0000-000000000003', null, 'recheio', 'Nutella',       2.00, true),
  ('c0000004-0000-0000-0000-000000000004', null, 'recheio', 'Goiabada',      0.00, true)
ON CONFLICT (id) DO NOTHING;

-- COBERTURAS
INSERT INTO public.opcoes_produto (id, produto_id, tipo, nome, preco_adicional, ativo) VALUES
  ('d0000001-0000-0000-0000-000000000001', null, 'cobertura', 'Amendoim',            0.00, true),
  ('d0000002-0000-0000-0000-000000000002', null, 'cobertura', 'Castanha de Caju',    0.00, true),
  ('d0000003-0000-0000-0000-000000000003', null, 'cobertura', 'Coco em Floco',       0.00, true),
  ('d0000004-0000-0000-0000-000000000004', null, 'cobertura', 'Chocolate Granulado', 0.00, true),
  ('d0000005-0000-0000-0000-000000000005', null, 'cobertura', 'Granulado Colorido',  0.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- KREPS
-- ============================================================
INSERT INTO public.produtos (id, categoria_id, nome, descricao, preco_base, ativo, permite_recheio, permite_cobertura, permite_tamanho) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002',
   'Krep Nutella',               'Crepe doce com Nutella',               15.00, true, false, false, false),
  ('e0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002',
   'Krep Doce de Leite + Banana','Crepe com doce de leite e banana',     15.00, true, false, false, false),
  ('e0000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002',
   'Krep Brigadeiro',            'Crepe doce com brigadeiro',            15.00, true, false, false, false),
  ('e0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002',
   'Krep Morango com Chantilly', 'Crepe doce com morango e chantilly',   16.00, true, false, false, false),
  ('e0000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002',
   'Krep Frango com Catupiry',   'Crepe salgado com frango e catupiry',  18.00, true, false, false, false),
  ('e0000006-0000-0000-0000-000000000006', 'a0000002-0000-0000-0000-000000000002',
   'Krep Presunto e Queijo',     'Crepe salgado com presunto e queijo',  17.00, true, false, false, false),
  ('e0000007-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002',
   'Krep Atum com Cream Cheese', 'Crepe salgado com atum e cream cheese',18.00, true, false, false, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BEBIDAS
-- ============================================================
INSERT INTO public.produtos (id, categoria_id, nome, descricao, preco_base, ativo, permite_recheio, permite_cobertura, permite_tamanho) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003',
   'Água',              null,                           3.00, true, false, false, false),
  ('f0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003',
   'Refrigerante Lata', 'Coca, Guaraná ou Sprite',      5.00, true, false, false, false),
  ('f0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003',
   'Suco em Caixinha',  null,                           4.00, true, false, false, false)
ON CONFLICT (id) DO NOTHING;
