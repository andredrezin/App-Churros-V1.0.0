-- Fix numero_dia duplicado: advisory lock garante exclusividade por dia
CREATE OR REPLACE FUNCTION public.proximo_numero_pedido()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  today_brt DATE;
  next_num  INTEGER;
BEGIN
  today_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  -- Impede duas chamadas simultâneas de retornar o mesmo número
  PERFORM pg_advisory_xact_lock(hashtext('pedido_num_' || today_brt::TEXT));
  SELECT COALESCE(MAX(numero_dia), 0) + 1
    INTO next_num
    FROM public.pedidos
   WHERE data_pedido = today_brt;
  RETURN next_num;
END;
$$;

-- Nome do cliente no pedido (opcional)
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS nome_cliente TEXT;
