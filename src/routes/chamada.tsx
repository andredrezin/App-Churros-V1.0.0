import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { padNum } from "@/lib/format";

export const Route = createFileRoute("/chamada")({
  component: ChamadaPage,
});

function playChime() {
  try {
    const ctx = new AudioContext();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

type ProntoItem = { id: string; numero_dia: number };

export default function ChamadaPage() {
  const [prontos, setProntos] = useState<ProntoItem[]>([]);
  const [destaque, setDestaque] = useState<ProntoItem | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const destaqueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarProntos = async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const { data } = await supabase.from("pedidos").select("id, numero_dia")
      .eq("data_pedido", today).eq("status", "pronto")
      .order("criado_em", { ascending: true });
    const lista = (data ?? []) as ProntoItem[];

    const novos = lista.filter((p) => !knownIds.current.has(p.id));
    if (novos.length) {
      playChime();
      setDestaque(novos[novos.length - 1]);
      if (destaqueTimer.current) clearTimeout(destaqueTimer.current);
      destaqueTimer.current = setTimeout(() => setDestaque(null), 12000);
    }
    knownIds.current = new Set(lista.map((p) => p.id));
    setProntos(lista);
  };

  useEffect(() => {
    carregarProntos();
    const ch = supabase.channel("chamada-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => carregarProntos())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (destaqueTimer.current) clearTimeout(destaqueTimer.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center select-none">
      {/* Logo */}
      <div className="text-center mb-10">
        <img src="/logo.png" alt="Churros Crocantes" className="h-28 mx-auto drop-shadow-[0_4px_24px_rgba(192,0,26,0.5)] mb-3" />
        <p className="text-muted-foreground text-lg">Retire seu pedido quando o número aparecer</p>
      </div>

      {/* Número em destaque */}
      {destaque ? (
        <div className="flex flex-col items-center animate-pulse-gold">
          <p className="text-muted-foreground text-xl uppercase tracking-widest mb-2">Pedido pronto</p>
          <div className="font-display text-[22vw] font-black leading-none text-primary drop-shadow-[0_0_60px_rgba(192,0,26,0.6)]">
            #{padNum(destaque.numero_dia)}
          </div>
          <p className="text-gold text-2xl font-bold mt-4 animate-bounce">Venha retirar! 🎉</p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground/40">
          <div className="font-display text-[18vw] font-black leading-none">---</div>
          <p className="text-xl mt-4">Aguardando próximo pedido</p>
        </div>
      )}

      {/* Fila de prontos (últimos 4) */}
      {prontos.length > 1 && (
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <p className="w-full text-center text-muted-foreground text-sm uppercase tracking-widest mb-1">Também prontos:</p>
          {prontos.filter((p) => p.id !== destaque?.id).slice(-4).map((p) => (
            <div key={p.id} className="rounded-2xl border-2 border-gold/40 bg-gold/10 px-8 py-4">
              <span className="font-display text-4xl font-bold text-gold">#{padNum(p.numero_dia)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Clock */}
      <Clock />
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(t);
  }, []);
  return <p className="absolute bottom-6 right-8 text-muted-foreground/50 text-2xl font-mono">{time}</p>;
}
