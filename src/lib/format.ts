export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const padNum = (n: number) => String(n).padStart(3, "0");
