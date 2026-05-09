-- Adiciona suporte a "esgotado" e foto por produto

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS esgotado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Política de storage para fotos de produtos (bucket criado via Dashboard)
-- Execute no Dashboard: Storage → New bucket → "produto-fotos" → Public
-- Depois aplique as políticas abaixo:

-- INSERT (upload) só para admin
-- SELECT (leitura) para todos (público)
-- As políticas de storage são gerenciadas separadamente no Dashboard
