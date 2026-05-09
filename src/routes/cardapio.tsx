import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import type { Categoria, Produto } from "@/lib/pos-types";
import { Flame, ChevronLeft, ChevronRight, QrCode } from "lucide-react";


export const Route = createFileRoute("/cardapio")({
  component: CardapioPublico,
});

type Foto = { id: string; produto_id: string; url: string; ordem: number };

export default function CardapioPublico() {
  const [cats, setCats] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-brand-gradient py-6 px-4 text-center shadow-warm">
        <img src="/logo.png" alt="Churros Crocantes" className="h-28 mx-auto drop-shadow-lg" />
        <p className="text-white/80 text-lg mt-1">Cardápio • Preços em Reais</p>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando cardápio…</div>
        ) : (
          cats.map((cat) => {
            const itens = produtos.filter((p) => p.categoria_id === cat.id);
            if (!itens.length) return null;
            return (
              <section key={cat.id}>
                <h2 className="font-display text-3xl font-bold text-gold mb-5 border-b border-gold/20 pb-2">{cat.nome}</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {itens.map((p) => {
                    const prodFotos = fotos.filter((f) => f.produto_id === p.id).sort((a, b) => a.ordem - b.ordem);
                    return <ProdutoCard key={p.id} produto={p} fotos={prodFotos} />;
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* Rodapé */}
        <footer className="text-center pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <QrCode className="h-4 w-4" />
            <span>Escaneie o QR Code na barraca para ver o cardápio atualizado</span>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-2">Preços sujeitos a alteração. Itens esgotados podem não estar disponíveis.</p>
        </footer>
      </div>
    </div>
  );
}

function ProdutoCard({ produto: p, fotos }: { produto: Produto; fotos: Foto[] }) {
  const [idx, setIdx] = useState(0);

  const prev = () => setIdx((i) => (i - 1 + fotos.length) % fotos.length);
  const next = () => setIdx((i) => (i + 1) % fotos.length);

  return (
    <div className={`rounded-2xl border-2 bg-card overflow-hidden transition ${p.esgotado ? "opacity-50 border-border" : "border-border"}`}>
      {/* Área de foto / carrossel */}
      {fotos.length > 0 ? (
        <div className="relative w-full h-52 bg-black select-none">
          <img
            src={fotos[idx].url}
            alt={`${p.nome} ${idx + 1}`}
            className="w-full h-full object-cover"
          />
          {fotos.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Indicadores */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {fotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-linear-to-br from-primary/20 to-gold/10 flex items-center justify-center">
          <Flame className="h-12 w-12 text-primary/30" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-bold leading-tight">{p.nome}</h3>
          {p.esgotado && (
            <span className="shrink-0 text-xs font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Esgotado</span>
          )}
        </div>
        {p.descricao && <p className="text-sm text-muted-foreground mt-1">{p.descricao}</p>}
        <div className="mt-3 text-gold font-bold text-2xl">{brl(p.preco_base)}</div>
      </div>
    </div>
  );
}
