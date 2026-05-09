import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { brl, padNum } from "@/lib/format";
import type { Pedido, Produto, Categoria } from "@/lib/pos-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { QRCodeSVG } from "qrcode.react";
import {
  LogOut, Crown, Download, TrendingUp, Package, Clock, DollarSign,
  Upload, QrCode, Share2, ExternalLink, ImageOff,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: () => <RoleGuard allow={["admin"]}><AdminPage /></RoleGuard>,
});

function AdminPage() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold">
              <Crown className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-none">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Churros Crocantes</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="p-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="cardapio">Cardápio</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento</TabsTrigger>
          <TabsTrigger value="qrcode">QR Code</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><Dashboard /></TabsContent>
        <TabsContent value="cardapio" className="mt-4"><Cardapio /></TabsContent>
        <TabsContent value="historico" className="mt-4"><Historico /></TabsContent>
        <TabsContent value="fechamento" className="mt-4"><Fechamento /></TabsContent>
        <TabsContent value="qrcode" className="mt-4"><QRCodeTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-warm">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
      <div className="font-display text-3xl font-bold text-gold mt-2">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [topItens, setTopItens] = useState<{ nome: string; qtd: number; pct: number }[]>([]);
  const [topHoje, setTopHoje] = useState<{ nome: string; qtd: number }[]>([]);
  const [horario, setHorario] = useState<{ hora: string; pedidos: number }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

      const { data } = await supabase.from("pedidos").select("*")
        .neq("status", "cancelado")
        .gte("criado_em", since.toISOString())
        .order("criado_em");
      const arr = (data ?? []).map((p: any) => ({ ...p, total: Number(p.total) })) as Pedido[];
      setPedidos(arr);

      const ids = arr.map((p) => p.id);
      if (ids.length) {
        const { data: itens } = await supabase.from("itens_pedido")
          .select("quantidade, pedido_id, produto:produtos(nome)").in("pedido_id", ids);

        const counts: Record<string, number> = {};
        const countsHoje: Record<string, number> = {};
        let totalQtd = 0;
        const hojeIds = new Set(arr.filter((p) => p.data_pedido === today).map((p) => p.id));

        (itens ?? []).forEach((i: any) => {
          const n = i.produto?.nome ?? "—";
          counts[n] = (counts[n] ?? 0) + i.quantidade;
          totalQtd += i.quantidade;
          if (hojeIds.has(i.pedido_id)) {
            countsHoje[n] = (countsHoje[n] ?? 0) + i.quantidade;
          }
        });

        setTopItens(
          Object.entries(counts)
            .map(([nome, qtd]) => ({ nome, qtd, pct: totalQtd ? (qtd / totalQtd) * 100 : 0 }))
            .sort((a, b) => b.qtd - a.qtd).slice(0, 8),
        );
        setTopHoje(
          Object.entries(countsHoje)
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd).slice(0, 6),
        );
      }

      const horas: Record<number, number> = {};
      arr.forEach((p) => { const h = new Date(p.criado_em).getHours(); horas[h] = (horas[h] ?? 0) + 1; });
      setHorario(Array.from({ length: 24 }, (_, h) => ({ hora: `${h}h`, pedidos: horas[h] ?? 0 })));
    })();
  }, []);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const fatHoje = pedidos.filter((p) => p.data_pedido === today).reduce((s, p) => s + p.total, 0);
  const semana = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const fatSemana = pedidos.filter((p) => p.data_pedido >= semana).reduce((s, p) => s + p.total, 0);
  const fatMes = pedidos.reduce((s, p) => s + p.total, 0);
  const pedidosHoje = pedidos.filter((p) => p.data_pedido === today).length;

  const daily: Record<string, number> = {};
  pedidos.forEach((p) => { daily[p.data_pedido] = (daily[p.data_pedido] ?? 0) + p.total; });
  const serie = Object.entries(daily).sort().map(([data, total]) => ({ data: data.slice(5), total }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Hoje" value={brl(fatHoje)} sub={`${pedidosHoje} pedidos`} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="7 dias" value={brl(fatSemana)} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="30 dias" value={brl(fatMes)} />
        <Stat icon={<Package className="h-4 w-4" />} label="Pedidos (30d)" value={String(pedidos.length)} />
      </div>

      {/* Top vendidos hoje */}
      {topHoje.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            🔥 Mais vendidos hoje
          </h3>
          <div className="flex flex-wrap gap-2">
            {topHoje.map((t, i) => (
              <div key={t.nome} className={`rounded-xl px-4 py-2 flex items-center gap-2 ${i === 0 ? "bg-gold/20 border border-gold/40" : "bg-secondary"}`}>
                <span className="font-semibold">{t.nome}</span>
                <span className="text-gold font-bold text-lg">{t.qtd}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4">
        <h3 className="font-display text-lg font-semibold mb-3">Faturamento diário (30 dias)</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.05 25)" />
              <XAxis dataKey="data" stroke="oklch(0.72 0.04 60)" />
              <YAxis stroke="oklch(0.72 0.04 60)" />
              <Tooltip contentStyle={{ background: "oklch(0.21 0.06 25)", border: "1px solid oklch(0.30 0.05 25)" }} />
              <Line type="monotone" dataKey="total" stroke="oklch(0.85 0.17 90)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-display text-lg font-semibold mb-3">Mais vendidos (30 dias)</h3>
          <div className="space-y-2">
            {topItens.map((t) => (
              <div key={t.nome}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t.nome}</span><span className="text-gold font-semibold">{t.qtd} ({t.pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gold-gradient" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
            {topItens.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Pico por horário</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={horario}>
                <XAxis dataKey="hora" stroke="oklch(0.72 0.04 60)" />
                <YAxis stroke="oklch(0.72 0.04 60)" />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.06 25)", border: "1px solid oklch(0.30 0.05 25)" }} />
                <Bar dataKey="pedidos" fill="oklch(0.50 0.21 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

type ProdutoFoto = { id: string; produto_id: string; url: string; ordem: number };

function Cardapio() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [fotos, setFotos] = useState<ProdutoFoto[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingProdId = useRef<string | null>(null);

  const reload = async () => {
    const [p, c, f] = await Promise.all([
      supabase.from("produtos").select("*").order("nome"),
      supabase.from("categorias").select("*").order("ordem"),
      supabase.from("produto_fotos").select("*").order("ordem"),
    ]);
    setProdutos((p.data ?? []).map((x: any) => ({ ...x, preco_base: Number(x.preco_base) })) as any);
    setCats((c.data ?? []) as any);
    setFotos((f.data ?? []) as ProdutoFoto[]);
  };
  useEffect(() => { reload(); }, []);

  const toggle = async (p: Produto) => {
    await supabase.from("produtos").update({ ativo: !p.ativo }).eq("id", p.id);
    toast.success(`${p.nome} ${!p.ativo ? "ativado" : "desativado"}`);
    reload();
  };

  const updatePreco = async (p: Produto, v: string) => {
    const n = parseFloat(v.replace(",", "."));
    if (isNaN(n)) return;
    await supabase.from("produtos").update({ preco_base: n }).eq("id", p.id);
    toast.success("Preço atualizado");
    reload();
  };

  const handleFotoClick = (prodId: string) => {
    uploadingProdId.current = prodId;
    fileInputRef.current?.click();
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const prodId = uploadingProdId.current;
    if (!files.length || !prodId) return;
    e.target.value = "";

    setUploading(prodId);
    const existingOrdem = fotos.filter((f) => f.produto_id === prodId).length;

    await Promise.all(files.map(async (file, idx) => {
      const ext = file.name.split(".").pop();
      const path = `${prodId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("produto-fotos").upload(path, file);
      if (upErr) { toast.error("Erro no upload: " + upErr.message); return; }
      const { data: urlData } = supabase.storage.from("produto-fotos").getPublicUrl(path);
      await supabase.from("produto_fotos").insert({
        produto_id: prodId, url: urlData.publicUrl, ordem: existingOrdem + idx,
      });
    }));

    // sincroniza foto_url do produto com a primeira foto
    const primeiraFoto = fotos.find((f) => f.produto_id === prodId)?.url
      ?? (await supabase.from("produto_fotos").select("url").eq("produto_id", prodId).order("ordem").limit(1).single()).data?.url;
    if (primeiraFoto) await supabase.from("produtos").update({ foto_url: primeiraFoto }).eq("id", prodId);

    toast.success(`${files.length} foto(s) adicionada(s)!`);
    setUploading(null);
    reload();
  };

  const removerFoto = async (foto: ProdutoFoto) => {
    await supabase.from("produto_fotos").delete().eq("id", foto.id);
    // extrai path do storage a partir da URL pública
    const path = foto.url.split("/produto-fotos/")[1];
    if (path) await supabase.storage.from("produto-fotos").remove([path]);

    // atualiza foto_url no produto
    const restantes = fotos.filter((f) => f.produto_id === foto.produto_id && f.id !== foto.id);
    await supabase.from("produtos").update({ foto_url: restantes[0]?.url ?? null }).eq("id", foto.produto_id);

    toast.success("Foto removida");
    reload();
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
      {cats.map((c) => (
        <div key={c.id} className="rounded-2xl border bg-card p-4">
          <h3 className="font-display text-xl font-bold text-gold mb-3">{c.nome}</h3>
          <div className="space-y-4">
            {produtos.filter((p) => p.categoria_id === c.id).map((p) => {
              const prodFotos = fotos.filter((f) => f.produto_id === p.id).sort((a, b) => a.ordem - b.ordem);
              return (
                <div key={p.id} className="rounded-lg bg-secondary/40 p-3">
                  {/* Linha principal: nome, preço, ativo */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-semibold">{p.nome}</div>
                      {p.descricao && <div className="text-xs text-muted-foreground">{p.descricao}</div>}
                    </div>
                    <Input
                      defaultValue={p.preco_base.toFixed(2)}
                      onBlur={(e) => updatePreco(p, e.target.value)}
                      className="w-24 text-right"
                    />
                    <Switch checked={p.ativo} onCheckedChange={() => toggle(p)} />
                  </div>

                  {/* Galeria de fotos */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {prodFotos.map((foto, idx) => (
                      <div key={foto.id} className="relative shrink-0 group">
                        <img src={foto.url} alt={`${p.nome} ${idx + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 text-[10px] font-bold bg-gold text-black px-1 rounded">capa</span>
                        )}
                        <button
                          onClick={() => removerFoto(foto)}
                          className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                        >
                          <ImageOff className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}

                    {/* Botão de adicionar fotos */}
                    <button
                      onClick={() => handleFotoClick(p.id)}
                      disabled={uploading === p.id}
                      className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 transition"
                    >
                      {uploading === p.id
                        ? <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Adicionar</span>
                        </>}
                    </button>
                  </div>
                  {prodFotos.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Sem fotos — clique em "Adicionar" para fazer upload (múltiplas de uma vez)</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground text-center">
        Bucket <strong>produto-fotos</strong> (público) obrigatório no Supabase Storage
      </p>
    </div>
  );
}

function Historico() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()));
  const [metodo, setMetodo] = useState<string>("todos");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const load = async () => {
    let q = supabase.from("pedidos").select("*").gte("data_pedido", from).lte("data_pedido", to).order("criado_em", { ascending: false });
    if (metodo !== "todos") q = q.eq("metodo_pagamento", metodo as any);
    const { data } = await q;
    setPedidos((data ?? []).map((p: any) => ({ ...p, total: Number(p.total) })) as any);
  };
  useEffect(() => { load(); }, [from, to, metodo]);

  const exportar = () => {
    const headers = ["numero", "data", "hora", "status", "metodo", "total"];
    const rows = pedidos.map((p) => [
      padNum(p.numero_dia), p.data_pedido, new Date(p.criado_em).toLocaleTimeString("pt-BR"),
      p.status, p.metodo_pagamento, p.total.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pedidos-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <div><label className="text-xs text-muted-foreground">De</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div>
          <label className="text-xs text-muted-foreground">Pagamento</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="h-9 rounded-md border bg-input px-2 text-sm block">
            <option value="todos">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="cartao">Cartão</option>
          </select>
        </div>
        <Button onClick={exportar} className="bg-gold-gradient text-accent-foreground hover:opacity-90"><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Data</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Pagto</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-bold text-gold">#{padNum(p.numero_dia)}</td>
                <td className="p-3">{new Date(p.criado_em).toLocaleString("pt-BR")}</td>
                <td className="p-3 capitalize">{p.status.replace("_", " ")}</td>
                <td className="p-3 capitalize">{p.metodo_pagamento}</td>
                <td className="p-3 text-right font-semibold">{brl(p.total)}</td>
              </tr>
            ))}
            {pedidos.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum pedido.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Fechamento() {
  const [data, setData] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()));
  const [resumo, setResumo] = useState<Record<string, { count: number; total: number }>>({});
  const [topHoje, setTopHoje] = useState<{ nome: string; qtd: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: peds } = await supabase.from("pedidos").select("id, metodo_pagamento, total")
        .eq("data_pedido", data).neq("status", "cancelado");
      const r: Record<string, { count: number; total: number }> = {};
      const ids = (peds ?? []).map((p: any) => p.id);
      (peds ?? []).forEach((p: any) => {
        r[p.metodo_pagamento] ??= { count: 0, total: 0 };
        r[p.metodo_pagamento].count++;
        r[p.metodo_pagamento].total += Number(p.total);
      });
      setResumo(r);

      if (ids.length) {
        const { data: itens } = await supabase.from("itens_pedido")
          .select("quantidade, produto:produtos(nome)").in("pedido_id", ids);
        const counts: Record<string, number> = {};
        (itens ?? []).forEach((i: any) => {
          const n = i.produto?.nome ?? "—";
          counts[n] = (counts[n] ?? 0) + i.quantidade;
        });
        setTopHoje(Object.entries(counts).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5));
      }
    })();
  }, [data]);

  const total = Object.values(resumo).reduce((s, r) => s + r.total, 0);
  const totalCount = Object.values(resumo).reduce((s, r) => s + r.count, 0);

  const compartilharWhatsApp = () => {
    const linhas = [
      `🍡 *Churros Crocantes — Fechamento ${data}*`,
      "",
      `💰 *Total: ${brl(total)}* (${totalCount} pedidos)`,
      "",
      "📊 Por forma de pagamento:",
      ...["dinheiro", "pix", "cartao"].map((m) =>
        resumo[m] ? `  • ${m.charAt(0).toUpperCase() + m.slice(1)}: ${brl(resumo[m].total)} (${resumo[m].count} pedidos)` : null,
      ).filter(Boolean),
      "",
      topHoje.length ? ["🔥 Mais vendidos:", ...topHoje.map((t) => `  ${t.qtd}× ${t.nome}`)].join("\n") : "",
    ].filter(Boolean).join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(linhas)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 flex items-end gap-3">
        <div><label className="text-xs text-muted-foreground">Data</label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        <Button onClick={compartilharWhatsApp} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Share2 className="h-4 w-4" /> WhatsApp
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {(["dinheiro", "pix", "cartao"] as const).map((m) => (
          <div key={m} className="rounded-2xl border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{m}</div>
            <div className="font-display text-3xl font-bold text-gold mt-1">{brl(resumo[m]?.total ?? 0)}</div>
            <div className="text-xs text-muted-foreground">{resumo[m]?.count ?? 0} pedidos</div>
          </div>
        ))}
      </div>

      {topHoje.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-display text-lg font-semibold mb-3">🔥 Mais vendidos do dia</h3>
          <div className="space-y-2">
            {topHoje.map((t, i) => (
              <div key={t.nome} className="flex items-center gap-3">
                <span className="text-gold font-bold w-6">{i + 1}º</span>
                <span className="flex-1">{t.nome}</span>
                <span className="font-bold text-lg">{t.qtd}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-gold bg-gold-gradient p-6 text-accent-foreground">
        <div className="text-sm uppercase tracking-wider opacity-80">Total do dia</div>
        <div className="font-display text-5xl font-black">{brl(total)}</div>
        <div className="text-sm opacity-80 mt-1">{totalCount} pedidos</div>
      </div>
    </div>
  );
}

function QRCodeTab() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const cardapioUrl = `${baseUrl}/cardapio`;
  const chamadaUrl = `${baseUrl}/chamada`;

  const downloadQR = (id: string, nome: string) => {
    const svg = document.getElementById(id);
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${nome}.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <QRCard
        id="qr-cardapio"
        title="Cardápio Público"
        description="Mostre este QR Code para os clientes. Eles veem o cardápio com fotos e preços no celular."
        url={cardapioUrl}
        onDownload={() => downloadQR("qr-cardapio", "cardapio")}
      />
      <QRCard
        id="qr-chamada"
        title="Tela de Chamada"
        description="Abra em uma TV ou tablet voltado para os clientes. Mostra o número do pedido quando fica pronto."
        url={chamadaUrl}
        onDownload={() => downloadQR("qr-chamada", "chamada")}
      />
    </div>
  );
}

function QRCard({ id, title, description, url, onDownload }: {
  id: string; title: string; description: string; url: string; onDownload: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
        <QrCode className="h-5 w-5 text-gold" /> {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG id={id} value={url} size={180} bgColor="#ffffff" fgColor="#1a0000" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-xs text-muted-foreground break-all font-mono bg-secondary/50 rounded-lg p-2">{url}</div>
          <div className="flex gap-2">
            <Button onClick={onDownload} className="flex-1 gap-2">
              <Download className="h-4 w-4" /> Baixar PNG
            </Button>
            <Button variant="outline" onClick={() => window.open(url, "_blank")} className="gap-2">
              <ExternalLink className="h-4 w-4" /> Abrir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
