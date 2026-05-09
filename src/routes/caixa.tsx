import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth";
import { useMenu, criarPedido, calcCartTotal } from "@/lib/pos";
import { brl, padNum } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem, MetodoPagamento, Produto, Pedido } from "@/lib/pos-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductDialog } from "@/components/pos/ProductDialog";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { OrderConfirmation } from "@/components/pos/OrderConfirmation";
import { Flame, LogOut, ShoppingCart, Trash2, X, ListOrdered } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/caixa")({
  component: () => <RoleGuard allow={["caixa", "admin"]}><CaixaPage /></RoleGuard>,
});

function CaixaPage() {
  const { user, signOut } = useAuth();
  const { categorias, produtos, opcoes, loading } = useMenu();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tab, setTab] = useState<string>("");
  const [selProduto, setSelProduto] = useState<Produto | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmNum, setConfirmNum] = useState<number | null>(null);
  const [recent, setRecent] = useState<Pedido[]>([]);
  const [filaCount, setFilaCount] = useState(0);

  useEffect(() => { if (categorias.length && !tab) setTab(categorias[0].id); }, [categorias, tab]);

  const loadRecent = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("pedidos").select("*")
      .eq("data_pedido", today).order("criado_em", { ascending: false }).limit(10);
    if (data) setRecent(data.map((p: any) => ({ ...p, total: Number(p.total) })) as any);
    const { count } = await supabase.from("pedidos").select("*", { count: "exact", head: true })
      .in("status", ["aguardando", "em_preparo"]);
    setFilaCount(count ?? 0);
  };

  useEffect(() => {
    loadRecent();
    const ch = supabase.channel("caixa-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => loadRecent())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const total = useMemo(() => calcCartTotal(cart), [cart]);

  const remover = (uid: string) => setCart((c) => c.filter((i) => i.uid !== uid));

  const finalizar = async (metodo: MetodoPagamento) => {
    if (!user) return;
    setPayOpen(false);
    const pedido = await criarPedido(cart, metodo, user.id);
    if (pedido) {
      setConfirmNum(pedido.numero_dia);
      setCart([]);
      toast.success(`Pedido #${padNum(pedido.numero_dia)} enviado para a produção`);
    }
  };

  const cancelar = async (id: string) => {
    if (!confirm("Cancelar este pedido?")) return;
    await supabase.from("pedidos").update({ status: "cancelado" }).eq("id", id);
    toast.success("Pedido cancelado");
  };

  const produtosTab = produtos.filter((p) => p.categoria_id === tab && p.ativo);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-warm">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none">Churros Crocantes</h1>
              <p className="text-xs text-muted-foreground">Caixa • Fila: <span className="text-gold font-semibold">{filaCount}</span></p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4 p-4">
        {/* Cardápio */}
        <div>
          {loading ? (
            <p className="text-muted-foreground">Carregando cardápio…</p>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3 h-12">
                {categorias.map((c) => (
                  <TabsTrigger key={c.id} value={c.id} className="text-base font-semibold">{c.nome}</TabsTrigger>
                ))}
              </TabsList>
              {categorias.map((c) => (
                <TabsContent key={c.id} value={c.id} className="mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {produtosTab.map((p) => (
                      <button
                        key={p.id}
                        disabled={p.esgotado}
                        onClick={() => !p.esgotado && setSelProduto(p)}
                        className={`group rounded-2xl border-2 bg-card p-4 text-left transition active:scale-95 relative
                          ${p.esgotado
                            ? "border-border opacity-50 cursor-not-allowed"
                            : "border-border hover:border-primary hover:shadow-warm cursor-pointer"}`}
                      >
                        {p.foto_url && (
                          <img src={p.foto_url} alt={p.nome} className="w-full h-24 object-cover rounded-lg mb-2" />
                        )}
                        {p.esgotado && (
                          <span className="absolute top-2 right-2 text-xs font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                            Esgotado
                          </span>
                        )}
                        <div className="font-display text-lg font-semibold leading-tight">{p.nome}</div>
                        {p.descricao && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descricao}</div>}
                        <div className="mt-3 text-gold font-bold text-xl">{brl(p.preco_base)}</div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Histórico */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
              <ListOrdered className="h-5 w-5 text-gold" /> Últimos pedidos do dia
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido ainda hoje.</p>}
              {recent.map((p) => (
                <div key={p.id} className="rounded-lg border bg-card p-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-lg font-bold text-gold">#{padNum(p.numero_dia)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {brl(p.total)} • <span className="capitalize">{p.status.replace("_", " ")}</span>
                    </div>
                  </div>
                  {p.status !== "cancelado" && p.status !== "entregue" && (
                    <Button size="sm" variant="ghost" onClick={() => cancelar(p.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carrinho */}
        <aside className="lg:sticky lg:top-20 self-start rounded-2xl border-2 border-border bg-card p-4 shadow-warm">
          <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-3">
            <ShoppingCart className="h-5 w-5 text-gold" /> Carrinho
          </h2>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {cart.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Adicione itens do cardápio.</p>}
            {cart.map((i) => (
              <div key={i.uid} className="rounded-lg bg-secondary/60 p-3 animate-slide-in-top">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{i.quantidade}× {i.produto.nome}</div>
                    {i.opcoes.length > 0 && (
                      <div className="text-xs text-gold/90">{i.opcoes.map((o) => o.nome).join(" + ")}</div>
                    )}
                    {i.observacao && <div className="text-xs italic text-muted-foreground mt-1">"{i.observacao}"</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{brl(i.precoUnitario * i.quantidade)}</div>
                    <button onClick={() => remover(i.uid)} className="text-destructive hover:opacity-70 mt-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm uppercase text-muted-foreground tracking-wider">Total</span>
              <span className="font-display text-3xl font-bold text-gold">{brl(total)}</span>
            </div>
            <Button
              disabled={cart.length === 0}
              onClick={() => setPayOpen(true)}
              className="w-full h-14 text-lg bg-brand-gradient hover:opacity-90 disabled:opacity-30"
            >
              Finalizar pedido
            </Button>
          </div>
        </aside>
      </div>

      <ProductDialog
        open={!!selProduto} onClose={() => setSelProduto(null)}
        produto={selProduto} opcoes={opcoes}
        onAdd={(item) => setCart((c) => [...c, item])}
      />
      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} total={total} onConfirm={finalizar} />
      <OrderConfirmation open={confirmNum != null} numero={confirmNum} onClose={() => setConfirmNum(null)} />
    </div>
  );
}
