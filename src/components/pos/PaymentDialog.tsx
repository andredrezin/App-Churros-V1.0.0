import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, CreditCard, QrCode } from "lucide-react";
import type { MetodoPagamento } from "@/lib/pos-types";
import { brl } from "@/lib/format";

export function PaymentDialog({
  open, onClose, total, onConfirm,
}: {
  open: boolean; onClose: () => void; total: number;
  onConfirm: (m: MetodoPagamento) => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPagamento | null>(null);
  const [recebido, setRecebido] = useState("");

  const troco = (() => {
    const v = parseFloat(recebido.replace(",", "."));
    if (isNaN(v) || v < total) return null;
    return v - total;
  })();

  const handleConfirm = (m: MetodoPagamento) => {
    if (m === "dinheiro") {
      setMetodo(m);
    } else {
      onConfirm(m);
    }
  };

  const handleClose = () => {
    setMetodo(null);
    setRecebido("");
    onClose();
  };

  const handleFinalizarDinheiro = () => {
    onConfirm("dinheiro");
    setMetodo(null);
    setRecebido("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Forma de pagamento</DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="font-display text-5xl font-bold text-gold">{brl(total)}</div>
        </div>

        {metodo === "dinheiro" ? (
          /* Tela de troco */
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor recebido (R$)</label>
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="Ex: 50,00"
                value={recebido}
                onChange={(e) => setRecebido(e.target.value)}
                className="text-2xl h-14 text-center font-bold"
              />
            </div>

            {recebido && (
              <div className={`rounded-xl p-4 text-center ${troco !== null ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                {troco !== null ? (
                  <>
                    <p className="text-sm text-muted-foreground">Troco</p>
                    <p className="font-display text-4xl font-black text-green-400">{brl(troco)}</p>
                  </>
                ) : (
                  <p className="text-destructive font-semibold">Valor insuficiente</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[20, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setRecebido(String(v))}
                  className="rounded-lg border border-border bg-secondary py-2 text-sm font-semibold hover:border-primary transition"
                >
                  R$ {v}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMetodo(null)}>Voltar</Button>
              <Button
                className="flex-1 bg-brand-gradient hover:opacity-90"
                disabled={troco === null}
                onClick={handleFinalizarDinheiro}
              >
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          /* Seleção de método */
          <>
            <div className="grid grid-cols-3 gap-3">
              <PayBtn icon={<Banknote className="h-8 w-8" />} label="Dinheiro" onClick={() => handleConfirm("dinheiro")} />
              <PayBtn icon={<QrCode className="h-8 w-8" />} label="PIX" onClick={() => handleConfirm("pix")} />
              <PayBtn icon={<CreditCard className="h-8 w-8" />} label="Cartão" onClick={() => handleConfirm("cartao")} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="w-full">Cancelar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-secondary p-4 hover:border-primary hover:bg-primary/10 transition">
      <span className="text-gold">{icon}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}
