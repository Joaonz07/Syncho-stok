export type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  codigo?: string;
};

export type ProdutoFiltro = {
  termo?: string;
  companyId?: string;
};
