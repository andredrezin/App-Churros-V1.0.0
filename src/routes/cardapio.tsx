import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import type { Categoria, Produto } from "@/lib/pos-types";
import {
  Flame, ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus,
  Trash2, MessageCircle, MapPin, Clock, Star, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Configuração ──────────────────────────────────────────────
const WHATSAPP_TEL = "5511999999999"; // ← troque pelo número real com DDI+DDD

// ─────────────────────────────────────────────────────────────

export const Route = createFileRoute("/cardapio")({
  component: CardapioPublico,
});

type Foto = { id: string; produto_id: string; url: string; ordem: number; tipo?: "foto" | "video" };
type CartEntry = { produto: Produto; quantidade: number };

export default function CardapioPublico() {
  const [cats, setCats] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<string>("todos");
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, p, f] = await Promise.all([
        supabase.from("categorias").select("*").eq("ativo", true).order("ordem"),
        supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
        supabase.from("produto_fotos").select("*").order("ordem"),
      ]);
      setCats((c.data ?? []) as Categoria[]);
      setProdutos((p.data ?? []).map((x: any) => ({ ...x, preco_base: Number(x.preco_base) })) as Produto[]);
      setFotos((f.data ?? []) as Foto[]);
      setLoading(false);
    })();
  }, []);

  const addToCart = (produto: Produto) => {
    setCart((prev) => {
      const existing = prev.find((e) => e.produto.id === produto.id);
      if (existing) return prev.map((e) => e.produto.id === produto.id ? { ...e, quantidade: e.quantidade + 1 } : e);
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const removeOne = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((e) => e.produto.id === id);
      if (!existing) return prev;
      if (existing.quantidade <= 1) return prev.filter((e) => e.produto.id !== id);
      return prev.map((e) => e.produto.id === id ? { ...e, quantidade: e.quantidade - 1 } : e);
    });
  };

  const removeAll = (id: string) => setCart((prev) => prev.filter((e) => e.produto.id !== id));

  const cartTotal = useMemo(() => cart.reduce((s, e) => s + e.produto.preco_base * e.quantidade, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, e) => s + e.quantidade, 0), [cart]);

  const pedirWhatsApp = () => {
    if (!cart.length) return;
    const lines = cart.map((e) => `• ${e.quantidade}x ${e.produto.nome} — ${brl(e.produto.preco_base * e.quantidade)}`);
    const msg = [
      "Olá! Quero fazer um pedido 😊",
      "",
      ...lines,
      "",
      `*Total: ${brl(cartTotal)}*`,
      "",
      "Posso confirmar?",
    ].join("\n");
    window.open(`https://wa.me/${WHATSAPP_TEL}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filteredProdutos = useMemo(() => {
    if (catFilter === "todos") return produtos;
    return produtos.filter((p) => p.categoria_id === catFilter);
  }, [produtos, catFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-brand-gradient py-16 px-4 text-center">
        {/* Ondas decorativas */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-black/10" />
          <div className="absolute top-8 right-8 h-32 w-32 rounded-full bg-gold/10" />
        </div>

        <div className="relative z-10 animate-fade-up">
          {/* Logo tipográfico — sem arquivo externo */}
          <div className="animate-hero-float inline-block mb-5">
            <div className="inline-flex flex-col items-center justify-center h-24 w-24 rounded-2xl bg-white/15 backdrop-blur shadow-warm border border-white/20">
              <Flame className="h-9 w-9 text-gold" />
              <span className="text-[10px] font-black text-white/90 tracking-widest uppercase mt-1">Churros</span>
            </div>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-black text-white drop-shadow-lg leading-tight">
            Churros<br/><span className="text-gold">Crocantes</span>
          </h1>
          <p className="text-white/80 text-lg mt-3 font-medium">Artesanais • Fresquinhos • Irresistíveis</p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {[
              { icon: <MapPin className="h-3.5 w-3.5" />, text: "Barraca de rua" },
              { icon: <Clock className="h-3.5 w-3.5" />, text: "Feitos na hora" },
              { icon: <Star className="h-3.5 w-3.5 fill-gold" />, text: "Receita artesanal" },
            ].map((b) => (
              <span key={b.text} className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-white/90 text-xs font-semibold">
                <span className="text-gold">{b.icon}</span>{b.text}
              </span>
            ))}
          </div>

          <Button
            onClick={() => document.getElementById("cardapio-section")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-8 h-12 px-10 text-base font-bold bg-gold text-black hover:bg-gold/90 shadow-gold rounded-full"
          >
            Ver cardápio ↓
          </Button>
        </div>
      </section>

      {/* ── Destaques ── */}
      <section className="bg-card/60 py-8 px-4 border-b border-border">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { emoji: "🔥", title: "Fresquinhos", desc: "Feitos na hora do pedido" },
            { emoji: "🍫", title: "Recheios", desc: "Doce de leite, chocolate e mais" },
            { emoji: "💛", title: "Amor", desc: "Receita da família há anos" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-1">
              <span className="text-3xl">{item.emoji}</span>
              <span className="font-display font-bold text-sm">{item.title}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cardápio ── */}
      <section id="cardapio-section" className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl font-bold">Cardápio</h2>
          {cartCount > 0 && (
            <button onClick={() => setCartOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-gold">
              <ShoppingCart className="h-4 w-4" />{cartCount} {cartCount === 1 ? "item" : "itens"}
            </button>
          )}
        </div>

        {/* Filtro por categoria */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          <FilterBtn active={catFilter === "todos"} onClick={() => setCatFilter("todos")}>Todos</FilterBtn>
          {cats.map((c) => (
            <FilterBtn key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>{c.nome}</FilterBtn>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-4/3 bg-secondary/60" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-secondary/60 rounded w-3/4" />
                  <div className="h-3 bg-secondary/40 rounded w-full" />
                  <div className="h-6 bg-secondary/40 rounded w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProdutos.map((p, idx) => {
              const prodFotos = fotos.filter((f) => f.produto_id === p.id).sort((a, b) => a.ordem - b.ordem);
              const qty = cart.find((e) => e.produto.id === p.id)?.quantidade ?? 0;
              return (
                <ProdutoCard
                  key={p.id} produto={p} fotos={prodFotos} qty={qty} idx={idx}
                  onAdd={() => addToCart(p)} onRemove={() => removeOne(p.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── CTA WhatsApp fixo no fundo ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur border-t border-border animate-slide-in-top">
          <div className="max-w-3xl mx-auto flex gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gold/30 bg-gold/10 text-gold font-semibold text-sm"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="animate-badge-bounce tabular-nums">{cartCount}</span>
              <span>{cartCount === 1 ? "item" : "itens"} • {brl(cartTotal)}</span>
            </button>
            <Button
              onClick={pedirWhatsApp}
              className="flex-1 h-12 text-base font-bold bg-[#25D366] hover:bg-[#1ebe5c] text-white gap-2 animate-pulse-soft rounded-xl"
            >
              <MessageCircle className="h-5 w-5" />
              Pedir via WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* ── Drawer do carrinho ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gold" /> Seu pedido
              </h3>
              <button onClick={() => setCartOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {cart.map((e) => (
                <div key={e.produto.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{e.produto.nome}</div>
                    <div className="text-sm text-gold font-bold">{brl(e.produto.preco_base * e.quantidade)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => removeOne(e.produto.id)} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:border-primary transition">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold w-4 text-center">{e.quantidade}</span>
                    <button onClick={() => addToCart(e.produto)} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:border-primary transition">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeAll(e.produto.id)} className="ml-1 text-destructive hover:opacity-70">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Total</span>
                <span className="font-display text-3xl font-bold text-gold">{brl(cartTotal)}</span>
              </div>
              <Button
                onClick={() => { setCartOpen(false); pedirWhatsApp(); }}
                className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#1ebe5c] text-white gap-2"
              >
                <MessageCircle className="h-6 w-6" />
                Pedir via WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Você será redirecionado para o WhatsApp com o pedido preenchido
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className={`text-center py-10 px-4 border-t border-border ${cartCount > 0 ? "pb-28" : ""}`}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-lg">Churros Crocantes</span>
        </div>
        <p className="text-xs text-muted-foreground">Artesanais • Feitos com amor</p>
        <p className="text-xs text-muted-foreground/50 mt-2">Preços sujeitos a alteração sem aviso prévio.</p>
      </footer>
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition border-2
        ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
    >
      {children}
    </button>
  );
}

const STAGGER_DELAYS = ["delay-0","delay-1","delay-2","delay-3","delay-4","delay-5","delay-6","delay-7"] as const;

function ProdutoCard({ produto: p, fotos, qty, idx: cardIdx, onAdd, onRemove }: {
  produto: Produto; fotos: Foto[]; qty: number; idx: number; onAdd: () => void; onRemove: () => void;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const prev = () => setSlideIdx((i) => (i - 1 + fotos.length) % fotos.length);
  const next = () => setSlideIdx((i) => (i + 1) % fotos.length);
  const delay = STAGGER_DELAYS[cardIdx % STAGGER_DELAYS.length];

  return (
    <div className={`rounded-2xl border-2 bg-card overflow-hidden transition animate-fade-up ${delay} ${p.esgotado ? "border-border" : "border-border hover:border-primary/50 hover:shadow-warm"}`}>
      {/* Área de mídia — sempre aspect-4/3 para consistência entre todos os cards */}
      <div className="relative w-full aspect-4/3 overflow-hidden select-none">
        {fotos.length > 0 ? (
          <>
            {fotos[slideIdx].tipo === "video" ? (
              <video src={fotos[slideIdx].url} className="w-full h-full object-cover object-top" controls playsInline preload="metadata" />
            ) : (
              <img src={fotos[slideIdx].url} alt={`${p.nome} ${slideIdx + 1}`} className="w-full h-full object-cover object-top" />
            )}
            {fotos.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"><ChevronRight className="h-4 w-4" /></button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {fotos.map((_, i) => (
                    <button key={i} onClick={() => setSlideIdx(i)} className={`h-1.5 rounded-full transition-all ${i === slideIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* Placeholder com nome do produto visível — mesmo tamanho que os com foto */
          <div className="w-full h-full bg-brand-gradient flex flex-col items-center justify-center gap-2 px-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Flame className="h-6 w-6 text-gold" />
            </div>
            <p className="font-display font-bold text-white text-center text-base leading-tight line-clamp-2">{p.nome}</p>
          </div>
        )}
        {/* Overlay esgotado */}
        {p.esgotado && (
          <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
            <span className="font-black text-white text-base bg-destructive px-4 py-1.5 rounded-full">Esgotado</span>
          </div>
        )}
      </div>

      {/* Conteúdo do card */}
      <div className="p-3">
        <h3 className="font-display text-base font-bold leading-tight line-clamp-1">{p.nome}</h3>
        {p.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.descricao}</p>}

        <div className="flex items-center justify-between mt-3">
          <span className="text-gold font-bold text-xl">{brl(p.preco_base)}</span>

          {p.esgotado ? null : qty === 0 ? (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={onRemove} className="h-8 w-8 rounded-xl border-2 border-border flex items-center justify-center hover:border-primary transition active:scale-90">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-bold text-base w-5 text-center tabular-nums">{qty}</span>
              <button onClick={onAdd} className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition active:scale-90">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
