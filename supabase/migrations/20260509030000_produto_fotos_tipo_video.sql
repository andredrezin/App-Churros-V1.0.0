-- Adiciona coluna tipo na tabela produto_fotos
ALTER TABLE public.produto_fotos
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'foto'
  CHECK (tipo IN ('foto', 'video'));

-- Atualiza o bucket para aceitar vídeos e aumentar limite para 60 MB
UPDATE storage.buckets
SET
  file_size_limit = 62914560,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/quicktime','video/webm'
  ]
WHERE id = 'produto-fotos';
