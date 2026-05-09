-- Galeria de fotos por produto (múltiplas fotos)

CREATE TABLE IF NOT EXISTS public.produto_fotos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  ordem      INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produto_fotos_produto ON public.produto_fotos(produto_id, ordem);

ALTER TABLE public.produto_fotos ENABLE ROW LEVEL SECURITY;

-- Leitura pública (cardápio sem login) e para autenticados
CREATE POLICY "fotos read anon"          ON public.produto_fotos FOR SELECT TO anon          USING (true);
CREATE POLICY "fotos read authenticated" ON public.produto_fotos FOR SELECT TO authenticated USING (true);

-- Escrita somente admin
CREATE POLICY "fotos admin all" ON public.produto_fotos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
