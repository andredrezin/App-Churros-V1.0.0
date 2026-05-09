import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { brl, padNum } from "@/lib/format";
import type { Pedido, ItemPedido, PedidoStatus } from "@/lib/pos-types";
import { Button } from "@/components/ui/button";
import { Flame, LogOut, ChefHat, RefreshCw, Wifi, WifiOff, PackageX } from "lucide-react";
import type { Produto } from "@/lib/pos-types";
import { toast } from "sonner";

export const Route = createFileRoute("/producao")({
  component: () => <RoleGuard allow={["producao", "admin"]}><ProducaoPage /></RoleGuard>,
});

type FullPedido = Pedido & { itens: (ItemPedido & { produto_nome?: string; categoria_id?: string })[] };

const STATUS_NEXT: Record<PedidoStatus, PedidoStatus | null> = {
  aguardando: "em_preparo",
  em_preparo: "pronto",
  pronto: "entregue",
  entregue: null,
  cancelado: null,
};

const STATUS_LABEL: Record<PedidoStatus, string> = {
  aguardando: "AGUARDANDO",
  em_preparo: "EM PREPARO",
  pronto: "PRONTO",
  entregue: "ENTREGUE",
  cancelado: "CANCELADO",
};

function playDing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    ctx.close();
  } catch {}
}

function ProducaoPage() {
  const { signOut } = useAuth();
  const [pedidos, setPedidos] = useState<FullPedido[]>([]);
  const [filter, setFilter] = useState<"todos" | "churros" | "kreps">("todos");
  const [now, setNow] = useState(Date.now());
  const knownIds = useRef<Set<string>>(new Set());
  const [catIds, setCatIds] = useState<{ churros: string | null; kreps: string | null }>({ churros: null, kreps: null });
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estoqueOpen, setEstoqueOpen] = useState(false);

  useEffect(() => {
    supabase.from("categorias").select("id, nome").then(({ data }) => {
      const find = (name: string) =>
        data?.find((c: any) => c.nome.toLowerCase().includes(name))?.id ?? null;
      setCatIds({ churros: find("churro"), kreps: find("krep") });
    });
    supabase.from("produtos").select("id, nome, ativo, esgotado").eq("ativo", true).order("nome")
      .then(({ data }) => setProdutos((data ?? []) as Produto[]));
  }, []);

  const toggleEsgotado = async (p: Produto) => {
    const novoEsgotado = !p.esgotado;
    await supabase.from("produtos").update({ esgotado: novoEsgotado }).eq("id", p.id);
    setProdutos((prev) => prev.map((x) => x.id === p.id ? { ...x, esgotado: novoEsgotado } : x));
    toast.success(`${p.nome} marcado como ${novoEsgotado ? "esgotado" : "disponível"}`);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const reload = async () => {
    // usa fuso de Brasília para coincidir com data_pedido do banco
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const { data: peds, error: pedsErr } = await supabase.from("pedidos").select("*")
      .eq("data_pedido", today)
      .in("status", ["aguardando", "em_preparo", "pronto"])
      .order("criado_em", { ascending: true });
    if (pedsErr) { toast.error("Erro ao carregar pedidos: " + pedsErr.message); return; }
    if (!peds) return;
    const ids = peds.map((p: any) => p.id);
    let itens: any[] = [];
    if (ids.length) {
      const { data, error: itensErr } = await supabase.from("itens_pedido")
        .select("*, produto:produtos(nome, categoria_id)")
        .in("pedido_id", ids);
      if (itensErr) toast.error("Erro ao carregar itens: " + itensErr.message);
      itens = data ?? [];
    }
    const full = peds.map((p: any) => ({
      ...p, total: Number(p.total),
      itens: itens.filter((i: any) => i.pedido_id === p.id).map((i: any) => ({
        ...i, preco_unitario: Number(i.preco_unitario),
        produto_nome: i.produto?.nome, categoria_id: i.produto?.categoria_id,
      })),
    })) as FullPedido[];

    // Toca som se houver novo pedido aguardando
    const newAguardando = full.filter((p) => p.status === "aguardando" && !knownIds.current.has(p.id));
    if (knownIds.current.size && newAguardando.length) {
      playDing();
      toast.success(`Novo pedido #${padNum(newAguardando[0].numero_dia)}`);
    }
    knownIds.current = new Set(full.map((p) => p.id));
    setPedidos(full);
  };

  const [realtimeOk, setRealtimeOk] = useState<boolean | null>(null);

  useEffect(() => {
    reload();
    const ch = supabase.channel("prod-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_pedido" }, () => reload())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeOk(true);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeOk(false);
          toast.error("Realtime desconectado — atualizando manualmente");
          // fallback: poll a cada 8 s se Realtime falhar
          const t = setInterval(reload, 8000);
          return () => clearInterval(t);
        }
      });
    return () => { supabase.removeChannel(ch); };
  }, []);

  const todayCount = pedidos.length; // visíveis = ativos; histórico:
  const [hojeTotal, setHojeTotal] = useState(0);
  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    supabase.from("pedidos").select("*", { count: "exact", head: true })
      .eq("data_pedido", today).neq("status", "cancelado")
      .then(({ count }) => setHojeTotal(count ?? 0));
  }, [pedidos.length]);

  const advance = async (p: FullPedido) => {
    const next = STATUS_NEXT[p.status];
    if (!next) return;
    await supabase.from("pedidos").update({
      status: next, finalizado_em: next === "entregue" ? new Date().toISOString() : null,
    }).eq("id", p.id);
  };

  const filtered = useMemo(() => {
    if (filter === "todos") return pedidos;
    const want = filter === "churros" ? catIds.churros : catIds.kreps;
    if (!want) return pedidos;
    return pedidos.filter((p) => p.itens.some((i) => i.categoria_id === want));
  }, [pedidos, filter, catIds]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-warm">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none">Produção</h1>
              <p className="text-xs text-muted-foreground"><span className="text-gold font-bold">{hojeTotal}</span> pedidos hoje • {pedidos.length} na fila</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(["todos", "churros", "kreps"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={reload} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEstoqueOpen(true)} title="Estoque">
              <PackageX className="h-4 w-4" />
            </Button>
            {realtimeOk === true && <Wifi className="h-4 w-4 text-green-500" aria-label="Realtime ativo" />}
            {realtimeOk === false && <WifiOff className="h-4 w-4 text-destructive" aria-label="Realtime offline" />}
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="md:hidden flex gap-1 bg-secondary rounded-lg p-1 mx-4 mb-2">
          {(["todos", "churros", "kreps"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 rounded-md text-sm font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Flame className="h-16 w-16 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-xl text-muted-foreground">Nenhum pedido na fila</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => <OrderCard key={p.id} pedido={p} now={now} onAdvance={() => advance(p)} />)}
          </div>
        )}
      </div>

      {/* Drawer de estoque */}
      {estoqueOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setEstoqueOpen(false)} />
          <div className="w-80 bg-card border-l border-border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <PackageX className="h-5 w-5 text-gold" /> Estoque
              </h2>
              <button onClick={() => setEstoqueOpen(false)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Toque para marcar como esgotado ou disponível</p>
              {produtos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleEsgotado(p)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 p-3 transition
                    ${p.esgotado ? "border-destructive bg-destructive/10" : "border-border bg-secondary/40 hover:border-primary"}`}
                >
                  <span className="font-semibold text-left">{p.nome}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.esgotado ? "bg-destructive text-destructive-foreground" : "bg-green-500/20 text-green-400"}`}>
                    {p.esgotado ? "Esgotado" : "Disponível"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ pedido, now, onAdvance }: { pedido: FullPedido; now: number; onAdvance: () => void }) {
  const elapsed = Math.floor((now - new Date(pedido.criado_em).getTime()) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const colorMap: Record<string, string> = {
    aguardando: "border-destructive bg-destructive/10",
    em_preparo: "border-warning bg-warning/10",
    pronto: "border-success bg-success/15 animate-pulse-gold",
  };
  const labelColor: Record<string, string> = {
    aguardando: "text-destructive",
    em_preparo: "text-warning",
    pronto: "text-success",
  };

  return (
    <div className={`rounded-2xl border-4 p-4 shadow-warm animate-slide-in-top ${colorMap[pedido.status] ?? "border-border bg-card"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="font-display text-5xl font-black leading-none text-foreground">#{padNum(pedido.numero_dia)}</div>
        <div className="text-right">
          <div className={`text-xs font-bold tracking-widest ${labelColor[pedido.status]}`}>{STATUS_LABEL[pedido.status]}</div>
          <div className="text-2xl font-mono font-bold mt-1">{mm}:{ss}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {new Date(pedido.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {brl(pedido.total)}
      </div>
      <div className="space-y-1.5 mb-3">
        {pedido.itens.map((i) => (
          <div key={i.id} className="rounded-md bg-background/50 p-2">
            <div className="font-semibold text-base">{i.quantidade}× {i.produto_nome}</div>
            {i.opcoes_texto && <div className="text-sm text-gold">{i.opcoes_texto}</div>}
            {i.observacao && <div className="text-sm italic text-warning">"{i.observacao}"</div>}
          </div>
        ))}
      </div>
      <Button onClick={onAdvance} className="w-full h-12 text-base font-bold uppercase bg-foreground/10 hover:bg-foreground/20 text-foreground">
        {pedido.status === "aguardando" && "Iniciar preparo"}
        {pedido.status === "em_preparo" && "Marcar como pronto"}
        {pedido.status === "pronto" && "Entregue"}
      </Button>
    </div>
  );
}
