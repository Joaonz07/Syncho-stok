export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao';

export type ItemVenda = {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
};

export type Venda = {
  id: string;
  data: string;
  total: number;
  formaPagamento: FormaPagamento;
};

export type VendaCompleta = Venda & {
  itens: ItemVenda[];
};

export type CriarVendaPayload = {
  companyId: string;
  formaPagamento: FormaPagamento;
  itens: Array<{ produtoId: string; quantidade: number }>;
};
