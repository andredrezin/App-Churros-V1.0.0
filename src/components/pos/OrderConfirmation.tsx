import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { padNum } from "@/lib/format";

export function OrderConfirmation({
  open, numero, onClose,
}: { open: boolean; numero: number | null; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md text-center">
        <div className="py-8 space-y-4 animate-slide-in-top">
          <CheckCircle2 className="h-20 w-20 text-success mx-auto" />
          <div className="text-sm uppercase tracking-widest text-muted-foreground">Pedido confirmado</div>
          <div className="font-display text-8xl font-black text-gold leading-none">
            #{numero != null ? padNum(numero) : "—"}
          </div>
          <p className="text-muted-foreground">Mostre este número ao cliente.</p>
          <Button onClick={onClose} className="w-full h-12 bg-brand-gradient hover:opacity-90 mt-4">
            Próximo pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
