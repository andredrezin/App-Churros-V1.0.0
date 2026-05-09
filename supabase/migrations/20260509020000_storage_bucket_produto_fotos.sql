-- Cria o bucket público para fotos de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produto-fotos',
  'produto-fotos',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Política: qualquer um pode ver (leitura pública)
DROP POLICY IF EXISTS "Fotos públicas — leitura" ON storage.objects;
CREATE POLICY "Fotos públicas — leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produto-fotos');

-- Política: apenas usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "Fotos — upload autenticado" ON storage.objects;
CREATE POLICY "Fotos — upload autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'produto-fotos' AND auth.role() = 'authenticated');

-- Política: apenas usuários autenticados podem deletar
DROP POLICY IF EXISTS "Fotos — delete autenticado" ON storage.objects;
CREATE POLICY "Fotos — delete autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'produto-fotos' AND auth.role() = 'authenticated');
