import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Categoria, Produto, Opcao, CartItem, MetodoPagamento, Pedido,
} from "@/lib/pos-types";
import { brl, padNum } from "@/lib/format";
import { toast } from "sonner";

export function useMenu() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, p, o] = await Promise.all([
        supabase.from("categorias").select("*").order("ordem"),
        supabase.from("produtos").select("*").order("nome"),
        supabase.from("opcoes_produto").select("*").order("nome"),
      ]);
      if (c.data) setCategorias(c.data as any);
      if (p.data) setProdutos(p.data.map((x: any) => ({ ...x, preco_base: Number(x.preco_base) })) as any);
      if (o.data) setOpcoes(o.data.map((x: any) => ({ ...x, preco_adicional: Number(x.preco_adicional) })) as any);
      setLoading(false);
    })();
  }, []);

  return { categorias, produtos, opcoes, loading };
}

export { brl, padNum };

export const calcItemTotal = (item: CartItem) =>
  item.precoUnitario * item.quantidade;

export const calcCartTotal = (items: CartItem[]) =>
  items.reduce((s, i) => s + calcItemTotal(i), 0);

export async function criarPedido(
  itens: CartItem[],
  metodo: MetodoPagamento,
  userId: string,
): Promise<Pedido | null> {
  const { data: numData, error: numErr } = await supabase.rpc("proximo_numero_pedido");
  if (numErr || numData == null) { toast.error("Erro ao gerar número do pedido"); return null; }
  const numero = numData as number;
  const total = calcCartTotal(itens);

  const { data: pedido, error: pErr } = await supabase
    .from("pedidos")
    .insert({
      numero_dia: numero, status: "aguardando", metodo_pagamento: metodo,
      total, criado_por: userId,
    })
    .select().single();

  if (pErr || !pedido) { toast.error("Erro ao criar pedido: " + pErr?.message); return null; }

  await Promise.all(itens.map(async (it) => {
    const opcoesTxt = it.opcoes.map((o) => o.nome).join(" + ");
    const { data: ip, error: ipErr } = await supabase.from("itens_pedido").insert({
      pedido_id: pedido.id, produto_id: it.produto.id, quantidade: it.quantidade,
      preco_unitario: it.precoUnitario, observacao: it.observacao || null,
      opcoes_texto: opcoesTxt || null,
    }).select().single();
    if (ipErr || !ip) { toast.error("Erro ao salvar item: " + ipErr?.message); return; }
    if (it.opcoes.length) {
      await supabase.from("itens_opcoes").insert(
        it.opcoes.map((o) => ({ item_pedido_id: ip.id, opcao_id: o.id, preco_adicional: o.preco_adicional })),
      );
    }
  }));

  return { ...pedido, total: Number(pedido.total) } as any;
}
