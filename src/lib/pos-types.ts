export type Categoria = { id: string; nome: string; ordem: number; ativo: boolean };
export type Produto = {
  id: string; categoria_id: string; nome: string; descricao: string | null;
  preco_base: number; ativo: boolean; esgotado: boolean; foto_url: string | null;
  permite_recheio: boolean; permite_cobertura: boolean; permite_tamanho: boolean;
};
export type OpcaoTipo = "recheio" | "cobertura" | "tamanho";
export type Opcao = {
  id: string; produto_id: string | null; tipo: OpcaoTipo; nome: string;
  preco_adicional: number; ativo: boolean;
};
export type PedidoStatus = "aguardando" | "em_preparo" | "pronto" | "entregue" | "cancelado";
export type MetodoPagamento = "dinheiro" | "pix" | "cartao";

export type Pedido = {
  id: string; numero_dia: number; data_pedido: string; status: PedidoStatus;
  metodo_pagamento: MetodoPagamento; total: number; observacao: string | null;
  nome_cliente: string | null; criado_em: string; finalizado_em: string | null;
};

export type ItemPedido = {
  id: string; pedido_id: string; produto_id: string;
  quantidade: number; preco_unitario: number;
  observacao: string | null; opcoes_texto: string | null;
};

export type CartItem = {
  uid: string;
  produto: Produto;
  quantidade: number;
  observacao: string;
  opcoes: Opcao[];
  precoUnitario: number;
};
