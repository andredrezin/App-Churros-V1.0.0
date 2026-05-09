import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";
import type { Produto, Opcao, CartItem } from "@/lib/pos-types";
import { Minus, Plus } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  produto: Produto | null;
  opcoes: Opcao[];
  onAdd: (item: CartItem) => void;
};

export function ProductDialog({ open, onClose, produto, opcoes, onAdd }: Props) {
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [recheio, setRecheio] = useState<Opcao | null>(null);
  const [cobertura, setCobertura] = useState<Opcao | null>(null);

  if (!produto) return null;

  const recheios = opcoes.filter((o) => o.tipo === "recheio");
  const coberturas = opcoes.filter((o) => o.tipo === "cobertura");

  const reset = () => { setQtd(1); setObs(""); setRecheio(null); setCobertura(null); };
  const close = () => { reset(); onClose(); };

  const adicional = (recheio?.preco_adicional ?? 0) + (cobertura?.preco_adicional ?? 0);
  const unit = produto.preco_base + adicional;

  const handleAdd = () => {
    if (produto.permite_recheio && !recheio) return;
    if (produto.permite_cobertura && !cobertura) return;
    const opcs: Opcao[] = [recheio, cobertura].filter(Boolean) as Opcao[];
    onAdd({
      uid: crypto.randomUUID(),
      produto, quantidade: qtd, observacao: obs,
      opcoes: opcs, precoUnitario: unit,
    });
    close();
  };

  const isChurro = produto.permite_recheio || produto.permite_cobertura;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{produto.nome}</DialogTitle>
          {produto.descricao && <p className="text-sm text-muted-foreground">{produto.descricao}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {produto.permite_recheio && (
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gold">Recheio</Label>
              <div className="grid grid-cols-2 gap-2">
                {recheios.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRecheio(r)}
                    className={`rounded-lg border-2 p-3 text-left transition ${
                      recheio?.id === r.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="font-medium">{r.nome}</div>
                    {r.preco_adicional > 0 && <div className="text-xs text-gold">+ {brl(r.preco_adicional)}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {produto.permite_cobertura && (
            <div>
              <Label className="mb-2 block text-sm font-semibold text-gold">Cobertura</Label>
              <div className="grid grid-cols-2 gap-2">
                {coberturas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCobertura(c)}
                    className={`rounded-lg border-2 p-3 text-left transition ${
                      cobertura?.id === c.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="font-medium">{c.nome}</div>
                    {c.preco_adicional > 0 && <div className="text-xs text-gold">+ {brl(c.preco_adicional)}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-semibold">Quantidade</Label>
            <div className="flex items-center gap-3">
              <Button type="button" size="icon" variant="outline" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input value={qtd} onChange={(e) => setQtd(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 text-center text-lg" />
              <Button type="button" size="icon" variant="outline" onClick={() => setQtd((q) => q + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-semibold">Observação</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder='Ex: "sem cobertura", "extra recheio"' rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={handleAdd} className="bg-brand-gradient hover:opacity-90 min-w-32">
            Adicionar — {brl(unit * qtd)}
          </Button>
        </DialogFooter>
        {isChurro && (!recheio || !cobertura) && (
          <p className="text-xs text-warning text-right">Selecione recheio e cobertura</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
