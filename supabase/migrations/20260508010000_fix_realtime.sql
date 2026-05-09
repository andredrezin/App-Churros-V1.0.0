-- Garante configuração de Realtime nas tabelas principais
-- Execute no SQL Editor do Supabase Dashboard se os pedidos não aparecerem em tempo real

-- Replica identity FULL necessário para postgres_changes entregar o payload completo
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.itens_pedido REPLICA IDENTITY FULL;

-- Re-adiciona às tabelas à publicação (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'itens_pedido'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_pedido;
  END IF;
END $$;
